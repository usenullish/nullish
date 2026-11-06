# jobs

Background jobs: the generation of the invoice PDFs and the migrations, triggered by callers, and the cleanup of the generated PDFs, run on a schedule.

- Queues run on BullMQ with its PostgreSQL backend, in a dedicated schema (`JOB_QUEUES_SCHEMA`) migrated by `setupJobQueuesDb`. No Redis is needed.
- `startJobs` (`src/start.ts`) sets up the queues and returns the started `triggered` and `scheduled` jobs, and a `close` that stops both and then closes the browser shared by the jobs that render PDFs. The server passes the triggered jobs to the engine services and calls `close` on shutdown.
- A job extends `Job` (`src/jobs/_job.ts`) with a payload and a result schema (`nullish-schema/jobs`), and implements `worker`. Results are validated when the worker returns and payloads when read with `getPayload`.
- Triggered jobs extend `TriggeredJob` and are keyed by `TriggeredJobKey`. `TriggeredJobs` (`src/jobs.triggered.ts`) starts them. Callers `trigger` a job by its key, which validates the payload and returns a job id, then read its state with `getState`.
- The engine never imports this package: `TriggeredJobKey`, `PdfStoragePath` and the `TriggerJobs` interface, which `TriggeredJobs` implements, live in `nullish-schema/jobs`. Callers that only trigger jobs or read their state type them as `TriggerJobs`. Only the code that starts and stops the jobs (the server's entry point) imports this package. The tests of the engine services that trigger jobs live in `tests/engine/`.
- Scheduled jobs extend `ScheduledJob`, are keyed by `ScheduledJobKey` and declare an `intervalMs`. `ScheduledJobs` (`src/jobs.scheduled.ts`) starts them and registers their schedule with `schedule`, a BullMQ job scheduler identified by the key, so restarts and several instances update the same schedule. They run without payload. `unschedule` removes the scheduler, e.g. in tests or when a job is retired.
- The work lives in a worker class under `src/jobs/workers/` (`create()` + `run()` or `prepare()`), the job class only wires it to the queue.
- Workers that read or write data access the database as the user of the payload (`withDbContext` + the engine stores), so row-level security applies to jobs too.
- Generated PDFs are temporary downloads stored under a `PdfStoragePath`. `PdfCleanupJob` deletes those older than two hours, every 15 minutes: a PDF can only be downloaded while the result of its job, which holds the document id, is kept (one hour).
- `PdfGenerator` renders HTML with Puppeteer and a shared browser instance. JavaScript is disabled and external requests are blocked, the templates must be self-contained.
