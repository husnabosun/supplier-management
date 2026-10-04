const cds = require('@sap/cds');
const {
    NAMESPACE, STATUS, PDF_MIME_TYPE, MIN_REJECTION_COMMENT_LENGTH, ALLOWED_REVISION_FIELDS,
    GEMINI_SERVICE_NAME, GEMINI_GENERATE_PATH, GEMINI_TIMEOUT_MS
} = require('./constants');

async function readCertificateBuffer(certificate) {
    const certificateChunks = [];
    if (Buffer.isBuffer(certificate)) {
        certificateChunks.push(certificate);
    } else if (certificate) {
        for await (const chunk of certificate) {
            certificateChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
    }
    // CAP may return streamed large-object values, so normalize both forms before base64 conversion.
    return Buffer.concat(certificateChunks);
}

function resolveAnalysisLanguage(req) {
    const sRequested = req.data.language || req.headers?.['accept-language'] || '';
    return /^tr/i.test(sRequested.trim()) ? 'Turkish' : 'English';
}

function buildGeminiRequest(certificateMimeType, certificateBase64, language) {
    const prompt = `You are reviewing a supplier certification document for a supplier onboarding process. 
    The current date is ${new Date().toISOString().slice(0, 10)}. Read the attached PDF and decide whether this supplier should be APPROVED or REJECTED. 
    Approve if the document reasonably presents itself as a legitimate certificate or qualification record, containing identifiable information such as a company name, 
    a certificate or reference number,
    an issuing body, and a date (even if the document is plain text rather than a designed/scanned certificate, and even if it lacks logos, stamps, or signatures;
    many legitimate digital certificates are plain documents). Additionally, check the certificate's validity or expiry date if one is stated: if the certificate
    has clearly EXPIRED (the stated valid-until date is before the current date), REJECT it specifically for being expired and mention the expiry date in your reasoning.
    Only REJECT for other reasons if the document is clearly NOT a certificate at all (e.g., blank, irrelevant content, gibberish, or missing basic identifying information like company name or
     any certifying body). Do not reject for minor inaccuracies, informal language, or lack of visual formatting alone. Respond ONLY with strict JSON, no markdown, no code fences:
     {"decision": "APPROVED" or "REJECTED", "reasoning": "short explanation written in ${language}, mentioning the expiry date explicitly if that was the reason for rejection"}.`;
    return {
        contents: [{
            parts: [
                { text: prompt },
                {
                    inline_data: {
                        mime_type: certificateMimeType,
                        data: certificateBase64
                    }
                }
            ]
        }]
    };
}

async function requestGeminiAnalysis(body) {
    const gemini = await cds.connect.to(GEMINI_SERVICE_NAME);
    const controller = new AbortController();
    let timeoutId;
    try {
        const timeout = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                controller.abort();
                reject(new Error('Gemini request timed out after 30 seconds.'));
            }, GEMINI_TIMEOUT_MS);
        });
        const response = await Promise.race([
            gemini.send({
                method: 'POST',
                path: GEMINI_GENERATE_PATH,
                headers: { 'content-type': 'application/json' },
                data: body,
                signal: controller.signal
            }),
            timeout
        ]);
        return response?.candidates?.[0]?.content?.parts?.[0]?.text;
    } finally {
        clearTimeout(timeoutId);
    }
}

function parseAnalysisResult(result) {
    const jsonText = String(result || '')
        .replace(/^\s*```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim();
    const analysis = JSON.parse(jsonText);
    if (![STATUS.APPROVED, STATUS.REJECTED].includes(analysis.decision) || typeof analysis.reasoning !== 'string') {
        throw new Error('Invalid analysis fields.');
    }
    return analysis;
}

async function decideApplication(req) {
    const { Suppliers } = cds.entities(NAMESPACE);
    const { ID, decision, comment, revisionFields } = req.data;

    if (!ID) {
        return req.error(400, 'Application ID is required.');
    }
    if (decision !== STATUS.APPROVED && decision !== STATUS.REJECTED) {
        return req.error(400, "Decision must be 'APPROVED' or 'REJECTED'.");
    }
    if (decision === STATUS.REJECTED && (!comment || !comment.trim())) {
        return req.error(400, 'A rejection comment is required when rejecting an application.');
    }
    if (decision === STATUS.REJECTED && comment.trim().length < MIN_REJECTION_COMMENT_LENGTH) {
        return req.error(400, `Rejection comment must be at least ${MIN_REJECTION_COMMENT_LENGTH} characters long.`);
    }

    let sRevisionFields = null;
    if (decision === STATUS.REJECTED) {
        const aTokens = (revisionFields || '').split(',').map(s => s.trim()).filter(Boolean);
        if (aTokens.length === 0) {
            return req.error(400, 'Please select at least one field that requires revision before rejecting.');
        }
        const aInvalid = aTokens.filter(sToken => !ALLOWED_REVISION_FIELDS.includes(sToken));
        if (aInvalid.length > 0) {
            return req.error(400, `Invalid revision field(s): ${aInvalid.join(', ')}.`);
        }
        sRevisionFields = aTokens.join(',');
    }

    const existing = await SELECT.one.from(Suppliers).where({ ID });
    if (!existing) {
        return req.error(404, 'Application not found.');
    }

    await UPDATE(Suppliers).set({
        status: decision,
        rejectionComment: decision === STATUS.REJECTED ? comment.trim() : null,
        revisionFields: sRevisionFields
    }).where({ ID });

    return { success: true, message: `Application ${decision.toLowerCase()}.` };
}

async function analyzeApplication(req) {
    const { Suppliers } = cds.entities(NAMESPACE);
    const { ID } = req.data;

    const application = await SELECT.one.from(Suppliers)
        .columns('ID', 'status', 'certificate', 'certificateMimeType')
        .where({ ID });
    if (!application) {
        return req.error(404, 'Application not found.');
    }
    if (application.status === STATUS.APPROVED || application.status === STATUS.REJECTED) {
        return req.error(409, 'This application has already been decided and cannot be re-analyzed.');
    }
    const certificateBuffer = await readCertificateBuffer(application.certificate);

    const certificateMimeType = String(application.certificateMimeType || '').trim().toLowerCase();
    const invalidCertificate = certificateBuffer.length === 0 || certificateMimeType !== PDF_MIME_TYPE;
    if (invalidCertificate) {
        return req.error(400, 'A valid PDF certificate is required for AI analysis.');
    }

    const body = buildGeminiRequest(certificateMimeType, certificateBuffer.toString('base64'), resolveAnalysisLanguage(req));

    let result;
    try {
        result = await requestGeminiAnalysis(body);
    } catch (err) {
        return req.error(500, `AI analysis failed: ${err.message}`);
    }

    let analysis;
    try {
        analysis = parseAnalysisResult(result);
    } catch (err) {
        return req.error(500, 'AI returned an unexpected response format.');
    }

    await UPDATE(Suppliers).set({
        status: analysis.decision,
        rejectionComment: analysis.decision === STATUS.REJECTED
            ? `[AI Analysis] ${analysis.reasoning}`
            : null,
        approvalComment: analysis.decision === STATUS.APPROVED
            ? `[AI Analysis] ${analysis.reasoning}`
            : null,
        revisionFields: analysis.decision === STATUS.REJECTED ? 'certificate' : null
    }).where({ ID });

    return {
        decision: analysis.decision,
        reasoning: analysis.reasoning
    };
}

module.exports = { decideApplication, analyzeApplication };
