import * as os from 'os';

export async function handleSystemInfoOperation(): Promise<any> {
    const cpus = os.cpus();
    return {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime_seconds: os.uptime(),
        cpu_cores: cpus.length,
        cpu_model: cpus.length > 0 ? cpus[0].model : 'unknown',
        total_memory_bytes: os.totalmem(),
        free_memory_bytes: os.freemem(),
    };
}
