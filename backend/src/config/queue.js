const { Queue, Worker, QueueScheduler } = require("bullmq");
const logger = require("../utils/logger");

const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

// Queue names
const QUEUE_NAMES = {
  NOTIFICATION: "notification-queue",
  EMAIL: "email-queue",
  SMS: "sms-queue",
  DOCUMENT_VERIFICATION: "document-verification-queue",
  RESUME_GENERATION: "resume-generation-queue",
  JOB_MATCHING: "job-matching-queue",
  TRUST_SCORE: "trust-score-queue",
  SCHEME_MATCHING: "scheme-matching-queue",
};

// Queue instances
const queues = {};

// Worker instances
const workers = {};

const createQueue = (queueName, options = {}) => {
  if (queues[queueName]) {
    return queues[queueName];
  }

  const queue = new Queue(queueName, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: {
        age: 24 * 3600, // 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // 7 days
      },
    },
    ...options,
  });

  queue.on("error", (error) => {
    logger.error(`Queue ${queueName} error:`, error);
  });

  queues[queueName] = queue;
  logger.info(`✅ Queue ${queueName} created`);

  return queue;
};

const createWorker = (queueName, processor, options = {}) => {
  if (workers[queueName]) {
    return workers[queueName];
  }

  const worker = new Worker(queueName, processor, {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
      max: 100,
      duration: 1000,
    },
    ...options,
  });

  worker.on("completed", (job) => {
    logger.info(`Job ${job.id} in ${queueName} completed`);
  });

  worker.on("failed", (job, error) => {
    logger.error(`Job ${job?.id} in ${queueName} failed:`, error);
  });

  worker.on("error", (error) => {
    logger.error(`Worker ${queueName} error:`, error);
  });

  worker.on("stalled", (jobId) => {
    logger.warn(`Job ${jobId} in ${queueName} stalled`);
  });

  workers[queueName] = worker;
  logger.info(`✅ Worker for ${queueName} created`);

  return worker;
};

// Get or create queues
const getNotificationQueue = () => createQueue(QUEUE_NAMES.NOTIFICATION);
const getEmailQueue = () => createQueue(QUEUE_NAMES.EMAIL);
const getSmsQueue = () => createQueue(QUEUE_NAMES.SMS);
const getDocumentVerificationQueue = () =>
  createQueue(QUEUE_NAMES.DOCUMENT_VERIFICATION);
const getResumeGenerationQueue = () =>
  createQueue(QUEUE_NAMES.RESUME_GENERATION);
const getJobMatchingQueue = () => createQueue(QUEUE_NAMES.JOB_MATCHING);
const getTrustScoreQueue = () => createQueue(QUEUE_NAMES.TRUST_SCORE);
const getSchemeMatchingQueue = () => createQueue(QUEUE_NAMES.SCHEME_MATCHING);

// Add job to queue
const addJob = async (queueName, jobName, data, options = {}) => {
  const queue = createQueue(queueName);
  const job = await queue.add(jobName, data, options);
  logger.info(`Job ${job.id} added to ${queueName}`);
  return job;
};

// Add delayed job
const addDelayedJob = async (
  queueName,
  jobName,
  data,
  delayMs,
  options = {},
) => {
  const queue = createQueue(queueName);
  const job = await queue.add(jobName, data, {
    delay: delayMs,
    ...options,
  });
  logger.info(
    `Delayed job ${job.id} added to ${queueName}, delay: ${delayMs}ms`,
  );
  return job;
};

// Add repeatable job
const addRepeatableJob = async (
  queueName,
  jobName,
  data,
  repeatOptions,
  options = {},
) => {
  const queue = createQueue(queueName);
  const job = await queue.add(jobName, data, {
    repeat: repeatOptions,
    ...options,
  });
  logger.info(`Repeatable job added to ${queueName}`);
  return job;
};

// Get queue stats
const getQueueStats = async (queueName) => {
  const queue = createQueue(queueName);
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    name: queueName,
    waiting,
    active,
    completed,
    failed,
    delayed,
  };
};

// Get all queues stats
const getAllQueuesStats = async () => {
  const stats = await Promise.all(
    Object.values(QUEUE_NAMES).map((name) => getQueueStats(name)),
  );
  return stats;
};

// Pause queue
const pauseQueue = async (queueName) => {
  const queue = queues[queueName];
  if (queue) {
    await queue.pause();
    logger.info(`Queue ${queueName} paused`);
  }
};

// Resume queue
const resumeQueue = async (queueName) => {
  const queue = queues[queueName];
  if (queue) {
    await queue.resume();
    logger.info(`Queue ${queueName} resumed`);
  }
};

// Close all queues and workers
const closeAllQueues = async () => {
  try {
    for (const [name, worker] of Object.entries(workers)) {
      await worker.close();
      logger.info(`Worker ${name} closed`);
    }

    for (const [name, queue] of Object.entries(queues)) {
      await queue.close();
      logger.info(`Queue ${name} closed`);
    }
  } catch (error) {
    logger.error("Error closing queues:", error);
    throw error;
  }
};

module.exports = {
  QUEUE_NAMES,
  createQueue,
  createWorker,
  getNotificationQueue,
  getEmailQueue,
  getSmsQueue,
  getDocumentVerificationQueue,
  getResumeGenerationQueue,
  getJobMatchingQueue,
  getTrustScoreQueue,
  getSchemeMatchingQueue,
  addJob,
  addDelayedJob,
  addRepeatableJob,
  getQueueStats,
  getAllQueuesStats,
  pauseQueue,
  resumeQueue,
  closeAllQueues,
};
