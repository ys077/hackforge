const interviewService = require("../services/interviewService");
const { success, created } = require("../utils/responses");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * @route POST /api/interviews/slots
 * @desc Create interview slots
 */
exports.createSlots = asyncHandler(async (req, res) => {
  const employerId = req.employer.id;
  const { job_id, slots } = req.body;
  const result = await interviewService.createSlots(employerId, job_id, slots);
  created(res, result, "Interview slots created");
});

/**
 * @route GET /api/interviews/slots/:jobId
 * @desc Get available slots for a job
 */
exports.getAvailableSlots = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const filters = {
    date_from: req.query.date_from,
    date_to: req.query.date_to,
    interview_type: req.query.interview_type,
  };
  const result = await interviewService.getAvailableSlots(jobId, filters);
  success(res, result);
});

/**
 * @route POST /api/interviews/book
 * @desc Book an interview slot
 */
exports.bookSlot = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const { slot_id, application_id } = req.body;
  const result = await interviewService.bookSlot(
    workerId,
    slot_id,
    application_id,
  );
  created(res, result, "Interview booked successfully");
});

/**
 * @route PUT /api/interviews/:id/cancel
 * @desc Cancel a booking
 */
exports.cancelBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.worker?.id || req.employer?.id;
  const cancelledBy = req.user.role === "worker" ? "worker" : "employer";
  const result = await interviewService.cancelBooking(
    id,
    userId,
    reason,
    cancelledBy,
  );
  success(res, result, "Booking cancelled");
});

/**
 * @route PUT /api/interviews/:id/reschedule
 * @desc Reschedule a booking
 */
exports.rescheduleBooking = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const { id } = req.params;
  const { new_slot_id } = req.body;
  const result = await interviewService.rescheduleBooking(
    id,
    workerId,
    new_slot_id,
  );
  success(res, result, "Interview rescheduled");
});

/**
 * @route GET /api/interviews/my
 * @desc Get worker's upcoming interviews
 */
exports.getWorkerInterviews = asyncHandler(async (req, res) => {
  const workerId = req.worker.id;
  const filters = {
    status: req.query.status,
    upcoming_only: req.query.upcoming_only !== "false",
  };
  const pagination = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
  };
  const result = await interviewService.getWorkerInterviews(
    workerId,
    filters,
    pagination,
  );
  success(res, result);
});

/**
 * @route GET /api/interviews/employer/schedule
 * @desc Get employer's interview schedule
 */
exports.getEmployerSchedule = asyncHandler(async (req, res) => {
  const employerId = req.employer.id;
  const filters = {
    job_id: req.query.job_id,
    date_from: req.query.date_from,
    date_to: req.query.date_to,
    status: req.query.status,
  };
  const pagination = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
  };
  const result = await interviewService.getEmployerSchedule(
    employerId,
    filters,
    pagination,
  );
  success(res, result);
});

/**
 * @route PUT /api/interviews/:id/complete
 * @desc Complete interview and record outcome
 */
exports.completeInterview = asyncHandler(async (req, res) => {
  const employerId = req.employer.id;
  const { id } = req.params;
  const outcomeData = {
    outcome: req.body.outcome,
    notes: req.body.notes,
    rating: req.body.rating,
    feedback: req.body.feedback,
  };
  const result = await interviewService.completeInterview(
    id,
    employerId,
    outcomeData,
  );
  success(res, result, "Interview completed");
});

/**
 * @route PUT /api/interviews/:id/no-show
 * @desc Mark interview as no-show
 */
exports.markNoShow = asyncHandler(async (req, res) => {
  const employerId = req.employer.id;
  const { id } = req.params;
  const result = await interviewService.markNoShow(id, employerId);
  success(res, result, "Marked as no-show");
});

/**
 * @route DELETE /api/interviews/slots/:id
 * @desc Delete interview slot
 */
exports.deleteSlot = asyncHandler(async (req, res) => {
  const employerId = req.employer.id;
  const { id } = req.params;
  const result = await interviewService.deleteSlot(id, employerId);
  success(res, result);
});
