interface CloudflareRateLimitBinding {
  limit(input:{key:string}):Promise<{success:boolean}>;
}

interface CloudflareEnv {
  APP_ENV:string;
  RATE_LIMIT_AUTH:CloudflareRateLimitBinding;
  RATE_LIMIT_MUTATION:CloudflareRateLimitBinding;
  RATE_LIMIT_ACCESS:CloudflareRateLimitBinding;
  JOB_RUNNER_SECRET:string;
}
