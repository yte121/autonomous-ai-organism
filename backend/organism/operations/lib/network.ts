export async function handleNetworkOperation(
    operationDetails: Record<string, any>
): Promise<any> {
    const { url, method, headers, body } = operationDetails;
    if (!url) {
        throw new Error('Network operation requires a URL.');
    }

    const response = await fetch(url, { method: method || 'GET', headers, body: body ? JSON.stringify(body) : undefined });
    const responseBody = await response.text();

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        try {
            data = JSON.parse(responseBody);
        } catch {
            data = responseBody;
        }
    } else {
        data = responseBody;
    }

    return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: data,
    };
}
