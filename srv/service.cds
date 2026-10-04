using { supplier.management as db } from '../db/schema';

service SupplierService {
    @restrict: [{ grant: 'READ', to: 'Approval' }]
    entity Suppliers as projection on db.Suppliers;

    type AuthResult {
        success : Boolean;
        message : String;
        email   : String;
    }

    type ApplicationStatus {
        hasApplication   : Boolean;
        status           : String;
        rejectionComment : String;
        revisionFields   : String;
        submittedAt      : Timestamp;
        companyName      : String;
    }

    type SubmitResult {
        success : Boolean;
        message : String;
    }

    type ApplicationDetails {
        companyName    : String;
        contactPerson  : String;
        phone          : String;
        country        : String;
        category       : String;
        taxNumber      : String;
        website        : String;
        address        : String;
        notes          : String;
        rejectionComment : String;
        revisionFields : String;
    }

    type AIAnalysisResult {
        decision  : String;
        reasoning : String;
    }

    @requires: 'any'
    action register(email: String, password: String) returns AuthResult;
    @requires: 'any'
    action login(email: String, password: String)    returns AuthResult;

    @requires: 'any'
    function myApplicationStatus(email: String) returns ApplicationStatus;
    @requires: 'any'
    function myApplicationDetails(email: String) returns ApplicationDetails;

    @requires: 'any'
    action submitApplication(
        email               : String,
        companyName         : String,
        contactPerson       : String,
        phone               : String,
        country             : String,
        category            : String,
        taxNumber           : String,
        website             : String,
        address             : String,
        notes               : String,
        certificateContent  : String,   // base64 encoded PDF
        certificateFileName : String,
        certificateMimeType : String
    ) returns SubmitResult;

    @requires: 'any'
    action reapplyApplication(
        email               : String,
        companyName         : String,
        contactPerson       : String,
        phone               : String,
        country             : String,
        category            : String,
        taxNumber           : String,
        website             : String,
        address             : String,
        notes               : String,
        certificateContent  : String,   // base64 encoded PDF
        certificateFileName : String,
        certificateMimeType : String
    ) returns SubmitResult;

    @requires: 'Approval'
    action decideApplication(
        ID             : UUID,
        decision       : String,   // 'APPROVED' or 'REJECTED'
        comment        : String,
        revisionFields : String    // comma-separated, required when decision is 'REJECTED'
    ) returns SubmitResult;

    @requires: 'Approval'
    action analyzeApplication(ID : UUID, language : String) returns AIAnalysisResult;
}

