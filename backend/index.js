const express = require('express');
const multer = require('multer');
const request = require('request');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const port = 8080;
const API_KEY = '93f2c4ebbc84b2f2254dbf813fca9504 ';
const OUTPUT_DIR = 'output_files/';
const CONVERSION_CATEGORY = 'document';
const CONVERSION_TARGET = 'docx';
const POLL_INTERVAL = 5000; 

const upload = multer({ dest: 'uploads/' });

app.use(express.json());

function initiateJob() {
    return new Promise((resolve, reject) => {
        const payload = {
            "input": [],
            "conversion": [{
                "category": CONVERSION_CATEGORY,
                "target": CONVERSION_TARGET,
                "options": {}
            }]
        };

        const options = {
            method: 'POST',
            url: 'https://api.api2convert.com/v2/jobs',
            headers: {
                'x-oc-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        };

        request(options, (error, response) => {
            if (error) return reject(error);
            const result = JSON.parse(response.body);
            if (result.id && result.server) {
                resolve({ jobId: result.id, server: result.server });
            } else {
                reject(new Error(`Failed to initiate job: ${response.body}`));
            }
        });
    });
}

function uploadFileToServer(server, jobId, filePath) {
    return new Promise((resolve, reject) => {
        const uploadUrl = `${server}/upload-file/${jobId}`;
        const fileStream = fs.createReadStream(filePath);

        const options = {
            method: 'POST',
            url: uploadUrl,
            headers: {
                'x-oc-api-key': API_KEY,
            },
            formData: {
                file: fileStream
            }
        };

        request(options, (error, response) => {
            if (error) return reject(error);
            resolve();
        });
    });
}

function pollJobStatus(jobId) {
    return new Promise((resolve, reject) => {
        const options = {
            method: 'GET',
            url: `https://api.api2convert.com/v2/jobs/${jobId}`,
            headers: {
                'x-oc-api-key': API_KEY
            }
        };

        const poll = () => {
            request(options, (error, response) => {
                if (error) return reject(error);

                const jobStatus = JSON.parse(response.body);

                if (jobStatus.status && jobStatus.status.code === 'completed') {
                    resolve(jobStatus);
                } else if (jobStatus.status && jobStatus.status.code === 'failed') {
                    reject(new Error(`Conversion failed: ${jobStatus.status.info}`));
                } else {
                    setTimeout(poll, POLL_INTERVAL);
                }
            });
        };

        poll();
    });
}

function downloadFile(url, savePath) {
    return new Promise((resolve, reject) => {
        request(url).pipe(fs.createWriteStream(savePath)).on('close', () => {
            resolve();
        }).on('error', (err) => {
            reject(err);
        });
    });
}

app.post('/convert', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { jobId, server } = await initiateJob();

        await uploadFileToServer(server, jobId, file.path);

        const jobStatus = await pollJobStatus(jobId);

        if (jobStatus.output && jobStatus.output.length > 0) {
            const outputUrl = jobStatus.output[0].uri;
            const outputFilename = `${path.parse(file.originalname).name}.${jobStatus.output[0].content_type.split('/').pop()}`;
            const outputPath = path.join(OUTPUT_DIR, outputFilename);

            await downloadFile(outputUrl, outputPath);

            res.sendFile(path.resolve(outputPath));
        } else {
            res.status(500).json({ error: 'Conversion completed but no output found' });
        }

    } catch (error) {
        console.error('Error during conversion:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (req.file) {
            fs.removeSync(req.file.path);
        }
    }
});

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
