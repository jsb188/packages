/**
 * Upload a file to Google Cloud Storage using a signed URL
 */

export function uploadFileToGCS(
	signedUrl: string,
	file: File,
	onProgress?: (progress: number) => void,
): Promise<boolean> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('PUT', signedUrl);
		xhr.setRequestHeader('Content-Type', file.type);

		xhr.upload.addEventListener('progress', (e) => {
			if (e.lengthComputable && onProgress) {
				const progress = Math.round((e.loaded / e.total) * 100);
				onProgress(progress);
			}
		});

		xhr.addEventListener('load', () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				resolve(true);
			} else {
				reject(new Error(`Upload failed with status ${xhr.status}`));
			}
		});

		xhr.addEventListener('error', () => {
			reject(new Error('Upload failed'));
		});

		xhr.send(file);
	});
}
