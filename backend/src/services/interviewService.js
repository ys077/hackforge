const { Op } = require("sequelize");
const {
  InterviewSlot,
  InterviewBooking,
  Job,
  Worker,
  Application,
} = require("../models");
const { cache } = require("../config/redis");
const { addJob, QUEUE_NAMES } = require("../config/queue");
const {
  NotFoundError,
  ConflictError,
  SlotBookingError,
} = require("../utils/errors");
const { paginate, formatPaginationResponse } = require("../utils/helpers");
const logger = require("../utils/logger");

class InterviewService {
  /**
   * Create interview slots
   */
  async createSlots(employerId, jobId, slotsData) {
    // Verify employer owns the job
    const job = await Job.findOne({
      where: { id: jobId, employer_id: employerId },
    });

    if (!job) {
      throw new NotFoundError("Job");
    }

    const createdSlots = [];
    const errors = [];

    for (const slotData of slotsData) {
      try {
        // Check for overlapping slots
        const hasOverlap = await InterviewSlot.hasOverlap(
          jobId,
          new Date(slotData.start_time),
          new Date(slotData.end_time),
        );

        if (hasOverlap) {
          errors.push({
            slot: slotData,
            error: "Time slot overlaps with existing slot",
          });
          continue;
        }

        const slot = await InterviewSlot.create({
          job_id: jobId,
          employer_id: employerId,
          start_time: slotData.start_time,
          end_time: slotData.end_time,
          duration_minutes: slotData.duration_minutes || 30,
          interview_type: slotData.interview_type || "in_person",
          location: slotData.location,
          location_lat: slotData.location_lat,
          location_lng: slotData.location_lng,
          meeting_link: slotData.meeting_link,
          phone_number: slotData.phone_number,
          max_bookings: slotData.max_bookings || 1,
          instructions: slotData.instructions,
          notes: slotData.notes,
        });

        createdSlots.push(slot);
      } catch (error) {
        errors.push({
          slot: slotData,
          error: error.message,
        });
      }
    }

    logger.info(
      `Created ${createdSlots.length} interview slots for job ${jobId}`,
    );

    return {
      created: createdSlots,
      errors,
    };
  }

  /**
   * Get available slots for a job
   */
  async getAvailableSlots(jobId, filters = {}) {
    const { date_from, date_to, interview_type } = filters;

    const where = {
      job_id: jobId,
      status: "available",
      start_time: { [Op.gt]: new Date() },
    };

    if (date_from) {
      where.start_time = { ...where.start_time, [Op.gte]: new Date(date_from) };
    }
    if (date_to) {
      where.start_time = { ...where.start_time, [Op.lte]: new Date(date_to) };
    }
    if (interview_type) {
      where.interview_type = interview_type;
    }

    const slots = await InterviewSlot.findAll({
      where,
      order: [["start_time", "ASC"]],
    });

    // Filter out fully booked slots
    return slots.filter((slot) => slot.current_bookings < slot.max_bookings);
  }

  /**
   * Book an interview slot
   */
  async bookSlot(workerId, slotId, applicationId = null) {
    // Use distributed lock to prevent race conditions
    const lockKey = `slot_lock:${slotId}`;
    const lockValue = await cache.acquireLock(lockKey, 10000);

    if (!lockValue) {
      throw new SlotBookingError("Unable to book slot. Please try again.");
    }

    try {
      const slot = await InterviewSlot.findByPk(slotId, {
        include: [
          {
            model: Job,
            as: "job",
            attributes: ["id", "title", "employer_id"],
          },
        ],
      });

      if (!slot) {
        throw new NotFoundError("Interview slot");
      }

      if (!slot.isAvailable()) {
        throw new SlotBookingError("This slot is no longer available");
      }

      // Check for double booking
      const hasDoubleBooking = await InterviewBooking.hasDoubleBooking(
        workerId,
        slotId,
      );
      if (hasDoubleBooking) {
        throw new SlotBookingError(
          "You already have an interview scheduled at this time",
        );
      }

      // Check if already booked this slot
      const alreadyBooked = await InterviewBooking.hasBookedSlot(
        workerId,
        slotId,
      );
      if (alreadyBooked) {
        throw new ConflictError("You have already booked this slot");
      }

      // If applicationId provided, verify worker owns the application
      if (applicationId) {
        const application = await Application.findOne({
          where: {
            id: applicationId,
            worker_id: workerId,
            job_id: slot.job_id,
          },
        });

        if (!application) {
          throw new NotFoundError("Application");
        }

        // Update application status
        await application.updateStatus("interview_scheduled");
      }

      // Create booking
      const booking = await InterviewBooking.create({
        worker_id: workerId,
        slot_id: slotId,
        application_id: applicationId,
        status: "scheduled",
      });

      // Generate confirmation code
      booking.generateConfirmationCode();
      await booking.save();

      // Update slot
      await slot.book();

      // Queue notifications
      await this.queueInterviewNotifications(booking, slot);

      logger.info(`Interview booked: ${booking.id}`);

      return {
        booking,
        slot,
        confirmationCode: booking.confirmation_code,
      };
    } finally {
      // Release lock
      await cache.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId, userId, reason, cancelledBy = "worker") {
    const booking = await InterviewBooking.findByPk(bookingId, {
      include: [
        {
          model: InterviewSlot,
          as: "slot",
        },
        {
          model: Worker,
          as: "worker",
        },
      ],
    });

    if (!booking) {
      throw new NotFoundError("Booking");
    }

    // Verify ownership
    if (cancelledBy === "worker" && booking.worker_id !== userId) {
      throw new NotFoundError("Booking");
    }

    if (!booking.canBeCancelled()) {
      throw new SlotBookingError("This booking cannot be cancelled");
    }

    // Cancel booking
    await booking.cancel(reason, cancelledBy);

    // Release slot if applicable
    if (booking.slot) {
      await booking.slot.releaseBooking();
    }

    // Update application status if linked
    if (booking.application_id) {
      const application = await Application.findByPk(booking.application_id);
      if (application) {
        await application.updateStatus("shortlisted", "Interview cancelled");
      }
    }

    // Queue cancellation notification
    await addJob(QUEUE_NAMES.NOTIFICATION, "interview-cancelled", {
      bookingId: booking.id,
      cancelledBy,
      reason,
    });

    logger.info(`Interview cancelled: ${booking.id}`);

    return booking;
  }

  /**
   * Reschedule a booking
   */
  async rescheduleBooking(bookingId, workerId, newSlotId) {
    const booking = await InterviewBooking.findByPk(bookingId, {
      include: [{ model: InterviewSlot, as: "slot" }],
    });

    if (!booking || booking.worker_id !== workerId) {
      throw new NotFoundError("Booking");
    }

    if (!booking.canBeRescheduled()) {
      throw new SlotBookingError("This booking cannot be rescheduled");
    }

    const newSlot = await InterviewSlot.findByPk(newSlotId);

    if (!newSlot || !newSlot.isAvailable()) {
      throw new SlotBookingError("New slot is not available");
    }

    // Ensure same job
    if (newSlot.job_id !== booking.slot.job_id) {
      throw new SlotBookingError("Cannot reschedule to a different job");
    }

    const lockKey = `slot_lock:${newSlotId}`;
    const lockValue = await cache.acquireLock(lockKey, 10000);

    if (!lockValue) {
      throw new SlotBookingError("Unable to reschedule. Please try again.");
    }

    try {
      // Release old slot
      await booking.slot.releaseBooking();

      // Update booking
      booking.original_slot_id = booking.original_slot_id || booking.slot_id;
      booking.slot_id = newSlotId;
      booking.status = "rescheduled";
      booking.reschedule_count += 1;
      await booking.save();

      // Book new slot
      await newSlot.book();

      // Queue notifications
      await addJob(QUEUE_NAMES.NOTIFICATION, "interview-rescheduled", {
        bookingId: booking.id,
        newSlotId,
      });

      return booking;
    } finally {
      await cache.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * Get worker's upcoming interviews
   */
  async getWorkerInterviews(workerId, filters = {}, pagination = {}) {
    const { status, upcoming_only = true } = filters;
    const { page = 1, limit = 20 } = pagination;
    const { offset } = paginate(page, limit);

    const where = { worker_id: workerId };

    if (status) {
      where.status = Array.isArray(status) ? { [Op.in]: status } : status;
    } else if (upcoming_only) {
      where.status = { [Op.in]: ["scheduled", "confirmed"] };
    }

    const include = [
      {
        model: InterviewSlot,
        as: "slot",
        include: [
          {
            model: Job,
            as: "job",
            attributes: ["id", "title", "employer_id"],
            include: [
              {
                model: require("../models").Employer,
                as: "employer",
                attributes: ["id", "company_name", "logo_url"],
              },
            ],
          },
        ],
      },
    ];

    if (upcoming_only) {
      include[0].where = {
        start_time: { [Op.gt]: new Date() },
      };
    }

    const { count, rows: bookings } = await InterviewBooking.findAndCountAll({
      where,
      include,
      order: [[{ model: InterviewSlot, as: "slot" }, "start_time", "ASC"]],
      limit,
      offset,
    });

    return formatPaginationResponse(bookings, count, page, limit);
  }

  /**
   * Get employer's interview schedule
   */
  async getEmployerSchedule(employerId, filters = {}, pagination = {}) {
    const { job_id, date_from, date_to, status } = filters;
    const { page = 1, limit = 20 } = pagination;
    const { offset } = paginate(page, limit);

    const slotWhere = { employer_id: employerId };

    if (job_id) {
      slotWhere.job_id = job_id;
    }
    if (date_from) {
      slotWhere.start_time = { [Op.gte]: new Date(date_from) };
    }
    if (date_to) {
      slotWhere.start_time = {
        ...slotWhere.start_time,
        [Op.lte]: new Date(date_to),
      };
    }

    const bookingWhere = {};
    if (status) {
      bookingWhere.status = status;
    }

    const { count, rows: slots } = await InterviewSlot.findAndCountAll({
      where: slotWhere,
      include: [
        {
          model: InterviewBooking,
          as: "bookings",
          where: bookingWhere,
          required: false,
          include: [
            {
              model: Worker,
              as: "worker",
              include: [
                {
                  model: require("../models").User,
                  as: "user",
                  attributes: ["name", "phone"],
                },
              ],
            },
          ],
        },
        {
          model: Job,
          as: "job",
          attributes: ["id", "title"],
        },
      ],
      order: [["start_time", "ASC"]],
      limit,
      offset,
    });

    return formatPaginationResponse(slots, count, page, limit);
  }

  /**
   * Complete interview and record outcome
   */
  async completeInterview(bookingId, employerId, outcomeData) {
    const booking = await InterviewBooking.findByPk(bookingId, {
      include: [
        {
          model: InterviewSlot,
          as: "slot",
          where: { employer_id: employerId },
        },
      ],
    });

    if (!booking) {
      throw new NotFoundError("Booking");
    }

    if (booking.status !== "scheduled" && booking.status !== "confirmed") {
      throw new SlotBookingError("Interview is not in a valid state");
    }

    await booking.complete(
      outcomeData.outcome,
      outcomeData.notes,
      outcomeData.rating,
    );

    if (outcomeData.feedback) {
      booking.feedback = outcomeData.feedback;
      await booking.save();
    }

    // Update application status if outcome is decisive
    if (booking.application_id) {
      const application = await Application.findByPk(booking.application_id);
      if (application) {
        if (outcomeData.outcome === "passed") {
          await application.updateStatus("selected");
        } else if (outcomeData.outcome === "failed") {
          await application.updateStatus("rejected", outcomeData.notes);
        }
      }
    }

    // Queue notification
    await addJob(QUEUE_NAMES.NOTIFICATION, "interview-completed", {
      bookingId: booking.id,
      outcome: outcomeData.outcome,
    });

    return booking;
  }

  /**
   * Mark interview as no-show
   */
  async markNoShow(bookingId, employerId) {
    const booking = await InterviewBooking.findByPk(bookingId, {
      include: [
        {
          model: InterviewSlot,
          as: "slot",
          where: { employer_id: employerId },
        },
      ],
    });

    if (!booking) {
      throw new NotFoundError("Booking");
    }

    await booking.markNoShow();

    // Update application
    if (booking.application_id) {
      const application = await Application.findByPk(booking.application_id);
      if (application) {
        await application.updateStatus("rejected", "No show at interview");
      }
    }

    return booking;
  }

  /**
   * Queue interview notifications (reminders, confirmations)
   */
  async queueInterviewNotifications(booking, slot) {
    // Immediate confirmation
    await addJob(QUEUE_NAMES.NOTIFICATION, "interview-booked", {
      bookingId: booking.id,
      workerId: booking.worker_id,
      slotDetails: {
        start_time: slot.start_time,
        location: slot.location,
        interview_type: slot.interview_type,
      },
    });

    // 24-hour reminder
    const reminderTime = new Date(slot.start_time);
    reminderTime.setHours(reminderTime.getHours() - 24);

    if (reminderTime > new Date()) {
      await addJob(
        QUEUE_NAMES.NOTIFICATION,
        "interview-reminder-24h",
        {
          bookingId: booking.id,
          workerId: booking.worker_id,
        },
        {
          delay: reminderTime.getTime() - Date.now(),
        },
      );
    }

    // 1-hour reminder
    const oneHourBefore = new Date(slot.start_time);
    oneHourBefore.setHours(oneHourBefore.getHours() - 1);

    if (oneHourBefore > new Date()) {
      await addJob(
        QUEUE_NAMES.NOTIFICATION,
        "interview-reminder-1h",
        {
          bookingId: booking.id,
          workerId: booking.worker_id,
        },
        {
          delay: oneHourBefore.getTime() - Date.now(),
        },
      );
    }
  }

  /**
   * Delete interview slot
   */
  async deleteSlot(slotId, employerId) {
    const slot = await InterviewSlot.findOne({
      where: { id: slotId, employer_id: employerId },
    });

    if (!slot) {
      throw new NotFoundError("Interview slot");
    }

    // Check for existing bookings
    if (slot.current_bookings > 0) {
      throw new SlotBookingError("Cannot delete slot with existing bookings");
    }

    await slot.destroy();

    return { message: "Slot deleted successfully" };
  }
}

module.exports = new InterviewService();
