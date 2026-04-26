const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const unzipper = require("unzipper");
const mime = require("mime-types");

const s3 = new S3Client({});
const destinationBucket = process.env.DESTINATION_BUCKET;

exports.handler = async (event) => {
    const bucket = event.Records[0].s3.bucket.name;
    const zipKey = event.Records[0].s3.object.key;

    // 1. Get the ZIP as a stream from S3
    const response = await s3.send(new GetObjectCommand({
        Bucket: bucket,
        Key: zipKey
    }));

    // 2. Determine destination prefix based on the zipKey (stripping 'deploy/' and the filename)
    const keyParts = zipKey.split('/');
    keyParts.shift(); // Remove 'deploy'
    keyParts.pop();   // Remove zip filename
    const destinationPrefix = keyParts.join('/');

    // 3. Pipe the S3 stream into the unzipper Parser
    const uploadPromises = [];

    await new Promise((resolve, reject) => {
        response.Body.pipe(unzipper.Parse())
            .on('entry', (entry) => {
                const fileName = entry.path;
                const type = entry.type; // 'Directory' or 'File'

                if (type === 'File') {
                    const contentType = mime.lookup(fileName) || 'application/octet-stream';
                    const finalKey = destinationPrefix ? `${destinationPrefix}/${fileName}` : fileName;

                    // 4. Create the parallel upload for each file
                    const upload = new Upload({
                        client: s3,
                        params: {
                            Bucket: destinationBucket,
                            Key: finalKey,
                            Body: entry, // The entry itself is a readable stream
                            ContentType: contentType
                        }
                    });

                    uploadPromises.push(upload.done());
                } else {
                    entry.autodrain();
                }
            })
            .on('finish', resolve)
            .on('error', reject);
    });

    // 4. Wait for all parallel uploads to complete
    try {
        await Promise.all(uploadPromises);
        console.log(`Successfully deployed all assets from ${zipKey}`);
    } catch (err) {
        console.error("Error during parallel upload:", err);
        throw err;
    }
};