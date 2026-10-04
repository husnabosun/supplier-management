const cds = require('@sap/cds');
const { NAMESPACE, MAX_CERTIFICATE_SIZE, PDF_MIME_TYPE, PDF_MAGIC, PHONE_REGEX, STATUS } = require('./constants');
const { normalizeEmail } = require('./auth-handlers');

function getCertificateSizeInBytes(certificateContent) {
    return Buffer.from(certificateContent, 'base64').length;
}

function hasPdfSignature(certificateContent) {
    return Buffer.from(certificateContent, 'base64').subarray(0, PDF_MAGIC.length).toString('latin1') === PDF_MAGIC;
}

function isValidPhone(phone) {
    return !phone || PHONE_REGEX.test(phone);
}

const REVISABLE_FIELDS = ['phone', 'country', 'category', 'taxNumber', 'website', 'address', 'notes'];

function buildSubmissionRecord(data) {
    return {
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        country: data.country,
        category: data.category,
        taxNumber: data.taxNumber,
        website: data.website,
        address: data.address,
        notes: data.notes,
        certificate: data.certificateContent,
        certificateMimeType: data.certificateMimeType,
        status: STATUS.SUBMITTED,
        submittedAt: new Date().toISOString(),
        submittedBy: data.email
    };
}

function buildReapplicationUpdate(data) {
    return {
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        phone: data.phone,
        country: data.country,
        category: data.category,
        taxNumber: data.taxNumber,
        website: data.website,
        address: data.address,
        notes: data.notes,
        status: STATUS.SUBMITTED,
        submittedAt: new Date().toISOString(),
        rejectionComment: null,
        approvalComment: null,
        revisionFields: null
    };
}

async function myApplicationStatus(req) {
    const { Suppliers } = cds.entities(NAMESPACE);
    const email = normalizeEmail(req.data.email);

    if (!email) {
        return req.error(400, 'Email is required.');
    }

    const application = await SELECT.one.from(Suppliers)
        .columns(
            'companyName', 'contactPerson', 'phone', 'country', 'category',
            'taxNumber', 'website', 'address', 'notes', 'status', 'submittedAt',
            'rejectionComment', 'revisionFields'
        )
        .where({ submittedBy: email });

    if (!application) {
        return {
            hasApplication: false,
            status: null,
            rejectionComment: null,
            revisionFields: null,
            submittedAt: null,
            companyName: null
        };
    }

    return {
        hasApplication: true,
        status: application.status,
        rejectionComment: application.rejectionComment,
        revisionFields: application.revisionFields,
        submittedAt: application.submittedAt,
        companyName: application.companyName
    };
}

async function submitApplication(req) {
    const { Suppliers } = cds.entities(NAMESPACE);
    const {
        companyName, contactPerson, phone, country, category,
        taxNumber, website, address, notes,
        certificateContent, certificateMimeType
    } = req.data;
    const email = normalizeEmail(req.data.email);

    // --- required space control on backend ---
    if (!email) {
        return req.error(400, 'Missing user context.');
    }
    if (!companyName || !companyName.trim()) {
        return req.error(400, 'Company name is required.');
    }
    if (!contactPerson || !contactPerson.trim()) {
        return req.error(400, 'Contact person is required.');
    }
    if (!certificateContent) {
        return req.error(400, 'Certificate file is required.');
    }
    if (!isValidPhone(phone)) {
        return req.error(400, 'Phone number may only contain digits, spaces, + and -.');
    }

    // --- Prevent the same user from submitting a second application ---
    const existing = await SELECT.one.from(Suppliers).where({ submittedBy: email });
    if (existing) {
        return req.error(409, 'You already have a submitted application.');
    }

    // --- File type check ---
    if (certificateMimeType !== PDF_MIME_TYPE) {
        return req.error(400, 'Only PDF files are allowed for the certificate.');
    }

    // --- File size check (base64 -> actual byte size) ---
    const sizeInBytes = getCertificateSizeInBytes(certificateContent);
    if (sizeInBytes > MAX_CERTIFICATE_SIZE) {
        return req.error(400, 'Certificate file must not exceed 10 MB.');
    }
    if (!hasPdfSignature(certificateContent)) {
        return req.error(400, 'The uploaded file is not a valid PDF.');
    }

    await INSERT.into(Suppliers).entries(buildSubmissionRecord({
        companyName,
        contactPerson,
        email,
        phone,
        country,
        category,
        taxNumber,
        website,
        address,
        notes,
        certificateContent,
        certificateMimeType
    }));

    return { success: true, message: 'Application submitted successfully.' };
}

async function myApplicationDetails(req) {
    const { Suppliers } = cds.entities(NAMESPACE);
    const email = normalizeEmail(req.data.email);

    if (!email) {
        return req.error(400, 'Email is required.');
    }

    const application = await SELECT.one.from(Suppliers).where({ submittedBy: email });
    if (!application) {
        return req.error(404, 'No application found for this user.');
    }

    return {
        companyName: application.companyName,
        contactPerson: application.contactPerson,
        phone: application.phone,
        country: application.country,
        category: application.category,
        taxNumber: application.taxNumber,
        website: application.website,
        address: application.address,
        notes: application.notes,
        rejectionComment: application.rejectionComment,
        revisionFields: application.revisionFields
    };
}

async function reapplyApplication(req) {
    const { Suppliers } = cds.entities(NAMESPACE);
    const {
        companyName, contactPerson, phone, country, category,
        taxNumber, website, address, notes,
        certificateContent, certificateMimeType
    } = req.data;
    const email = normalizeEmail(req.data.email);

    // --- Required field check (companyName/contactPerson are always sent, even if read-only) ---
    if (!email) {
        return req.error(400, 'Missing user context.');
    }
    if (!companyName || !companyName.trim()) {
        return req.error(400, 'Company name is required.');
    }
    if (!contactPerson || !contactPerson.trim()) {
        return req.error(400, 'Contact person is required.');
    }

    // --- Re-application can only be made on a rejected record ---
    const existing = await SELECT.one.from(Suppliers).where({ submittedBy: email });
    if (!existing) {
        return req.error(404, 'No existing application found to re-apply.');
    }
    if (existing.status !== STATUS.REJECTED) {
        return req.error(400, 'Only rejected applications can be re-applied.');
    }

    // Only fields the approver flagged are revisable; everything else keeps its stored value.
    const aRevisable = (existing.revisionFields || '').split(',').map(s => s.trim()).filter(Boolean);
    const submitted = { phone, country, category, taxNumber, website, address, notes };
    const oMerged = { companyName: existing.companyName, contactPerson: existing.contactPerson };
    for (const sField of REVISABLE_FIELDS) {
        oMerged[sField] = aRevisable.includes(sField) ? submitted[sField] : existing[sField];
    }
    if (!isValidPhone(oMerged.phone)) {
        return req.error(400, 'Phone number may only contain digits, spaces, + and -.');
    }

    const oUpdate = buildReapplicationUpdate(oMerged);

    // --- Certificate is always required: a new PDF must be uploaded for re-application ---
    if (!certificateContent) {
        return req.error(400, 'A new certificate must be uploaded to re-apply.');
    }
    if (certificateMimeType !== PDF_MIME_TYPE) {
        return req.error(400, 'Only PDF files are allowed for the certificate.');
    }
    const sizeInBytes = getCertificateSizeInBytes(certificateContent);
    if (sizeInBytes > MAX_CERTIFICATE_SIZE) {
        return req.error(400, 'Certificate file must not exceed 10 MB.');
    }
    if (!hasPdfSignature(certificateContent)) {
        return req.error(400, 'The uploaded file is not a valid PDF.');
    }
    oUpdate.certificate = certificateContent;
    oUpdate.certificateMimeType = certificateMimeType;

    await UPDATE(Suppliers).set(oUpdate).where({ ID: existing.ID });

    return { success: true, message: 'Application re-submitted successfully.' };
}

module.exports = { myApplicationStatus, submitApplication, myApplicationDetails, reapplyApplication };
