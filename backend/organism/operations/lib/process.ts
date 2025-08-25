import { exec } from 'child_process';

// A hardcoded allowlist for safe commands that can be executed by the 'process' operation.
const ALLOWED_PROCESS_COMMANDS = new Set([
    'git',
    'ls',
    'npx',
    'cat',
    'echo',
    'npm',
    'bun',
]);

export async function handleProcessOperation(
    operationDetails: Record<string, any>,
    sandboxDir: string
): Promise<any> {
    const { command } = operationDetails;
    if (typeof command !== 'string') {
        throw new Error('Process execution requires a command string.');
    }

    // Security Check: Only allow commands from the allowlist
    const executable = command.trim().split(' ')[0];
    if (!ALLOWED_PROCESS_COMMANDS.has(executable)) {
        throw new Error(`Command not allowed: '${executable}'. Only commands from the allowlist can be executed.`);
    }

    return new Promise((resolve, reject) => {
        exec(command, { cwd: sandboxDir }, (error, stdout, stderr) => {
            if (error) {
                // Reject with a structured error
                reject({
                    message: error.message,
                    stdout,
                    stderr,
                });
                return;
            }
            // Resolve with a structured success response
            resolve({ stdout, stderr });
        });
    });
}
