export interface LivenessStatus {
  status: 'ok';
  timestamp: string;
  uptime_seconds: number;
}

export interface ReadinessStatus {
  checks: {
    database: 'up';
  };
  status: 'ready';
  timestamp: string;
}
