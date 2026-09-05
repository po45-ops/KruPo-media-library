export interface ScheduledJobContext{scheduledAt:string;source:"local_test"|"cloudflare_cron"}
export interface JobResult{jobName:string;status:"succeeded"|"failed"|"partial";metrics:Record<string,number>;errorSummary?:string}
export interface SchedulerProvider{readonly name:"local_test"|"cloudflare_cron";run(context:ScheduledJobContext):Promise<JobResult[]>}
