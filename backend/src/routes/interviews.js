const express = require("express");
const router = express.Router();
const interviewController = require("../controllers/interviewController");
const {
  authenticate,
  workerOnly,
  employerOnly,
  loadWorkerProfile,
  loadEmployerProfile,
} = require("../middleware/auth");
const { validate, schemas } = require("../utils/validators");

/**
 * Worker routes
 */

/**
 * @route GET /api/interviews/slots/:jobId
 * @desc Get available slots for a job
 * @access Private
 */
router.get(
  "/slots/:jobId",
  authenticate,
  interviewController.getAvailableSlots,
);

/**
 * @route POST /api/interviews/book
 * @desc Book an interview slot
 * @access Private (Worker)
 */
router.post(
  "/book",
  authenticate,
  workerOnly,
  loadWorkerProfile,
  validate(schemas.interview.book),
  interviewController.bookSlot,
);

/**
 * @route GET /api/interviews/my
 * @desc Get worker's interviews
 * @access Private (Worker)
 */
router.get(
  "/my",
  authenticate,
  workerOnly,
  loadWorkerProfile,
  interviewController.getWorkerInterviews,
);

/**
 * @route PUT /api/interviews/:id/reschedule
 * @desc Reschedule booking
 * @access Private (Worker)
 */
router.put(
  "/:id/reschedule",
  authenticate,
  workerOnly,
  loadWorkerProfile,
  validate(schemas.interview.reschedule),
  interviewController.rescheduleBooking,
);

/**
 * Employer routes
 */

/**
 * @route POST /api/interviews/slots
 * @desc Create interview slots
 * @access Private (Employer)
 */
router.post(
  "/slots",
  authenticate,
  employerOnly,
  loadEmployerProfile,
  validate(schemas.interview.createSlots),
  interviewController.createSlots,
);

/**
 * @route GET /api/interviews/employer/schedule
 * @desc Get employer's interview schedule
 * @access Private (Employer)
 */
router.get(
  "/employer/schedule",
  authenticate,
  employerOnly,
  loadEmployerProfile,
  interviewController.getEmployerSchedule,
);

/**
 * @route PUT /api/interviews/:id/complete
 * @desc Complete interview
 * @access Private (Employer)
 */
router.put(
  "/:id/complete",
  authenticate,
  employerOnly,
  loadEmployerProfile,
  validate(schemas.interview.complete),
  interviewController.completeInterview,
);

/**
 * @route PUT /api/interviews/:id/no-show
 * @desc Mark as no-show
 * @access Private (Employer)
 */
router.put(
  "/:id/no-show",
  authenticate,
  employerOnly,
  loadEmployerProfile,
  interviewController.markNoShow,
);

/**
 * @route DELETE /api/interviews/slots/:id
 * @desc Delete interview slot
 * @access Private (Employer)
 */
router.delete(
  "/slots/:id",
  authenticate,
  employerOnly,
  loadEmployerProfile,
  interviewController.deleteSlot,
);

/**
 * Shared routes
 */

/**
 * @route PUT /api/interviews/:id/cancel
 * @desc Cancel booking
 * @access Private
 */
router.put(
  "/:id/cancel",
  authenticate,
  validate(schemas.interview.cancel),
  interviewController.cancelBooking,
);

module.exports = router;
