const NAMESPACE = 'supplier.management';
// ^ =start  one lowercase, one uppercase, one digit, one special character, minimum 8 characters $=end 
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const BCRYPT_SALT_ROUNDS = 10;
const MAX_CERTIFICATE_SIZE = 10 * 1024 * 1024; // 10 MB in bytes
const PDF_MIME_TYPE = 'application/pdf';
const MIN_REJECTION_COMMENT_LENGTH = 15;
// learn the regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s+-]+$/;
const PDF_MAGIC = '%PDF-';

// freeze the status object to make it immutable
const STATUS = Object.freeze({
    SUBMITTED: 'SUBMITTED',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED'
});

// companyName and contactPerson are permanently locked and can never be requested for revision
const ALLOWED_REVISION_FIELDS = ['phone', 'country', 'category', 'taxNumber', 'website', 'address', 'notes', 'certificate'];

const GEMINI_SERVICE_NAME = 'GEMINI_AI';
const GEMINI_GENERATE_PATH = '/v1beta/models/gemini-flash-latest:generateContent';
// 30 sec
const GEMINI_TIMEOUT_MS = 30000;

module.exports = {
    // NAMESPACE : NAMESPACE equals NAMESPACE
    NAMESPACE,
    PASSWORD_REGEX,
    BCRYPT_SALT_ROUNDS,
    MAX_CERTIFICATE_SIZE,
    PDF_MIME_TYPE,
    MIN_REJECTION_COMMENT_LENGTH,
    EMAIL_REGEX,
    PHONE_REGEX,
    PDF_MAGIC,
    STATUS,
    ALLOWED_REVISION_FIELDS,
    GEMINI_SERVICE_NAME,
    GEMINI_GENERATE_PATH,
    GEMINI_TIMEOUT_MS
};
