namespace supplier.management;

using { managed, cuid } from '@sap/cds/common';

entity Suppliers : cuid, managed {
    companyName      : String(100) not null;
    contactPerson    : String(100) not null;
    email            : String(255) ;
    phone            : String(30);
    country          : String(100);
    category         : String(50);
    taxNumber        : String(50);
    website          : String(255);
    address          : String(500);
    notes            : String(2000);
    certificate      : LargeBinary @Core.MediaType: certificateMimeType;
    certificateMimeType : String;
    status           : String(20) default 'Submitted';
    submittedAt      : Timestamp;
    submittedBy      : String(255);
    rejectionComment : String(1000);
    revisionFields   : String(500); // comma-separated field names the approver flagged for revision
}
entity Users : cuid {
    email        : String(255) not null;
    passwordHash : String(255) not null;
}