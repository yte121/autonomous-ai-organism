import * as fs from 'fs/promises';
import * as path from 'path';

export async function handleFileSystemOperation(
    operationDetails: Record<string, any>,
    sandboxDir: string,
    isPathInSandbox: (filePath: string) => boolean
): Promise<any> {
    const { action, path: targetPath, content } = operationDetails;

    if (!targetPath) {
        throw new Error('File system action requires a path.');
    }
    const safePath = path.join(sandboxDir, targetPath);

    if (!isPathInSandbox(safePath)) {
        throw new Error(`Path is outside the sandbox: ${targetPath}`);
    }

    switch (action) {
        case 'readFile':
            return await fs.readFile(safePath, 'utf8');
        case 'writeFile':
            if (typeof content !== 'string') {
                throw new Error('writeFile action requires string content.');
            }
            await fs.writeFile(safePath, content, 'utf8');
            return { result: `Successfully wrote to ${targetPath}` };
        case 'readdir':
            return await fs.readdir(safePath);
        case 'mkdir':
            await fs.mkdir(safePath, { recursive: true });
            return { result: `Successfully created directory ${targetPath}` };
        case 'rm':
            await fs.rm(safePath, { recursive: true, force: true });
            return { result: `Successfully deleted ${targetPath}` };
        default:
            throw new Error(`Unsupported file system action: ${action}`);
    }
}
