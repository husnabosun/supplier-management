sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../model/errorMapper",
  ],
  function (Controller, JSONModel, MessageToast, errorMapper) {
    "use strict";

    const PDF_MIME_TYPE = "application/pdf";
    const MAX_CERTIFICATE_SIZE = 10 * 1024 * 1024;
    const STATUS = {
      APPROVED: "APPROVED",
      REJECTED: "REJECTED",
    };

    return Controller.extend("supplier.portal.controller.Application", {
      onInit: function () {
        const oAppModel = new JSONModel({
          showForm: false,
          showStatus: false,
          companyName: "",
          showRejectionComment: false,
          rejectionMessage: "",
          showReapplyInfo: false,
          reapplyInfo: "",
          showReapply: false,
          isReapplyMode: false,
          editableFields: {
            phone: true,
            country: true,
            category: true,
            taxNumber: true,
            website: true,
            address: true,
            notes: true,
          },
        });
        this.getView().setModel(oAppModel, "app");
        this.getView().setModel(new JSONModel({ nodes: [], lanes: [] }), "pf");

        this._oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
        this._sCertificateBase64 = null;
        this._sCertificateFileName = null;
        this._sCertificateMimeType = null;

        // The view instance is reused by the router, so state must be refreshed on every navigation.
        this.getOwnerComponent().getRouter().getRoute("application").attachPatternMatched(this._onRouteMatched, this);
      },

      _onRouteMatched: function () {
        this._resetState();
        this._checkUserAndStatus();
      },

      _resetState: function () {
        const oAppModel = this.getView().getModel("app");
        oAppModel.setProperty("/showForm", false);
        oAppModel.setProperty("/showStatus", false);
        oAppModel.setProperty("/isReapplyMode", false);
        oAppModel.setProperty("/showRejectionComment", false);
        oAppModel.setProperty("/showReapply", false);
        oAppModel.setProperty("/showReapplyInfo", false);
        oAppModel.setProperty("/companyName", "");
        oAppModel.setProperty("/editableFields", {
          phone: true, country: true, category: true, taxNumber: true, website: true, address: true, notes: true,
        });
        this.getView().getModel("pf").setData({ nodes: [], lanes: [] });

        ["companyNameInput", "contactPersonInput", "phoneNumberInput", "countryInput", "taxNumberInput", "websiteInput", "addressInput", "notesInput"]
          .forEach((sId) => {
            const oControl = this.byId(sId);
            if (oControl) {
              oControl.setValue("");
              oControl.setValueState("None");
            }
          });
        this.byId("categorySelect").setSelectedIndex(0);
        this.byId("phoneCountryCode").setSelectedKey("+90");
        this.byId("certificateUploader").clear();
        this._sCertificateBase64 = null;
        this._sCertificateFileName = null;
        this._sCertificateMimeType = null;
      },

      _checkUserAndStatus: async function () {
        const sEmail = sessionStorage.getItem("currentUserEmail");

        if (!sEmail) {
          this.getOwnerComponent().getRouter().navTo("login");
          return;
        }

        this._sEmail = sEmail;

        try {
          const response = await fetch(
            "/odata/v4/supplier/myApplicationStatus(email='" +
              encodeURIComponent(sEmail) +
              "')",
          );
          const data = await response.json();
          const oAppModel = this.getView().getModel("app");
          this._applyApplicationStatus(data, oAppModel);
        } catch (err) {
          MessageToast.show(this._oBundle.getText("application.statusLoadError"));
        }
      },

      _applyApplicationStatus: function (data, oAppModel) {
        if (!data.hasApplication) {
          oAppModel.setProperty("/showForm", true);
          oAppModel.setProperty("/showStatus", false);
          return;
        }

        oAppModel.setProperty("/showForm", false);
        oAppModel.setProperty("/showStatus", true);
        oAppModel.setProperty("/isReapplyMode", false);
        oAppModel.setProperty("/companyName", data.companyName);
        this._applyProcessFlow(data.status);

        if (data.status === STATUS.REJECTED && data.rejectionComment) {
          oAppModel.setProperty("/showRejectionComment", true);
          oAppModel.setProperty(
            "/rejectionMessage",
            this._oBundle.getText("application.rejectionReasonPrefix") + " " + data.rejectionComment,
          );
        } else {
          oAppModel.setProperty("/showRejectionComment", false);
        }
        oAppModel.setProperty("/showReapply", data.status === STATUS.REJECTED);
      },

      _applyProcessFlow: function (sStatus) {
        const oBundle = this._oBundle;
        this.getView().getModel("pf").setData({
          lanes: [{ laneId: "lane1", text: oBundle.getText("application.processLaneText"), position: 0 }],
          nodes: this._buildProcessFlowNodes(sStatus),
        });
      },

      _buildProcessFlowNodes: function (sStatus) {
        const oBundle = this._oBundle;
        const oStates = this._getProcessFlowStates(sStatus);

        return [
          {
            laneId: "lane1", nodeId: "n1", title: oBundle.getText("application.processNodeSubmitted"),
            state: "Positive", stateText: oBundle.getText("application.processStateCompleted"),
            texts: [oBundle.getText("application.processReceivedText")], children: ["n2"],
          },
          {
            laneId: "lane1", nodeId: "n2", title: oBundle.getText("application.processNodeInReview"),
            state: oStates.reviewState, stateText: oStates.reviewStateText,
            texts: [], children: ["n3"],
          },
          {
            laneId: "lane1", nodeId: "n3", title: oStates.resultTitle,
            state: oStates.resultState, stateText: oStates.resultStateText,
            texts: [], children: [],
          },
        ];
      },

      _getProcessFlowStates: function (sStatus) {
        const oBundle = this._oBundle;
        if (sStatus === STATUS.APPROVED) {
          return {
            reviewState: "Positive",
            reviewStateText: oBundle.getText("application.processStateReviewed"),
            resultState: "Positive",
            resultStateText: oBundle.getText("application.processNodeApproved"),
            resultTitle: oBundle.getText("application.processNodeApproved"),
          };
        }
        if (sStatus === STATUS.REJECTED) {
          return {
            reviewState: "Positive",
            reviewStateText: oBundle.getText("application.processStateReviewed"),
            resultState: "Negative",
            resultStateText: oBundle.getText("application.processNodeRejected"),
            resultTitle: oBundle.getText("application.processNodeRejected"),
          };
        }
        return {
          reviewState: "Critical",
          reviewStateText: oBundle.getText("application.processStateInProgress"),
          resultState: "Planned",
          resultStateText: oBundle.getText("application.processStatePending"),
          resultTitle: oBundle.getText("application.processNodeResult"),
        };
      },

      onCertificateChange: function (oEvent) {
        const oFile =
          oEvent.getParameter("files") && oEvent.getParameter("files")[0];
        if (!oFile) {
          return;
        }

        if (oFile.type !== PDF_MIME_TYPE) {
          MessageToast.show(this._oBundle.getText("application.fileTypeMismatchError"));
          this._sCertificateBase64 = null;
          return;
        }

        if (oFile.size > MAX_CERTIFICATE_SIZE) {
          MessageToast.show(this._oBundle.getText("application.fileSizeExceedError"));
          this._sCertificateBase64 = null;
          return;
        }

        const oReader = new FileReader();
        oReader.onload = (e) => {
          // data:application/pdf;base64,XXXX -> sadece XXXX kısmını alıyoruz
          const sResult = e.target.result;
          this._sCertificateBase64 = sResult.split(",")[1];
          this._sCertificateFileName = oFile.name;
          this._sCertificateMimeType = oFile.type;
        };
        oReader.readAsDataURL(oFile);
      },

      onFileTypeMismatch: function () {
        MessageToast.show(this._oBundle.getText("application.fileTypeMismatchError"));
      },

      onFileSizeExceed: function () {
        MessageToast.show(this._oBundle.getText("application.fileSizeExceedError"));
      },

      onReapplyPress: async function () {
        try {
          const response = await fetch(
            "/odata/v4/supplier/myApplicationDetails(email='" +
              encodeURIComponent(this._sEmail) +
              "')",
          );
          if (!response.ok) {
            MessageToast.show(this._oBundle.getText("application.reapplyDataLoadError"));
            return;
          }
          const data = await response.json();
          const oAppModel = this.getView().getModel("app");

          this._populateReapplyForm(data);
          const aRevisionFields = this._getRevisionFields(data.revisionFields);
          this._setReapplyInformation(data, aRevisionFields, oAppModel);

          oAppModel.setProperty("/isReapplyMode", true);
          oAppModel.setProperty("/showForm", true);
          oAppModel.setProperty("/showStatus", false);
        } catch (err) {
          MessageToast.show(this._oBundle.getText("application.reapplyDataLoadError"));
        }
      },

      _populateReapplyForm: function (data) {
        this.byId("companyNameInput").setValue(data.companyName || "");
        this.byId("contactPersonInput").setValue(data.contactPerson || "");
        this._populatePhone(data.phone);
        this.byId("countryInput").setValue(data.country || "");
        this.byId("categorySelect").setSelectedKey(data.category || "");
        this.byId("taxNumberInput").setValue(data.taxNumber || "");
        this.byId("websiteInput").setValue(data.website || "");
        this.byId("addressInput").setValue(data.address || "");
        this.byId("notesInput").setValue(data.notes || "");

        this._sCertificateBase64 = null;
        this._sCertificateFileName = null;
        this._sCertificateMimeType = null;
        this.byId("certificateUploader").clear();
      },

      _populatePhone: function (sPhone) {
        const sValue = (sPhone || "").trim();
        const oSelect = this.byId("phoneCountryCode");
        const sMatchedKey = oSelect
          .getItems()
          .map((oItem) => oItem.getKey())
          .find((sKey) => sValue.startsWith(sKey + " ") || sValue.startsWith(sKey));
        oSelect.setSelectedKey(sMatchedKey || "+90");
        this.byId("phoneNumberInput").setValue(
          (sMatchedKey ? sValue.slice(sMatchedKey.length) : sValue).trim(),
        );
        this.byId("phoneNumberInput").setValueState("None");
      },

      onPhoneNumberLiveChange: function (oEvent) {
        const oInput = oEvent.getSource();
        const sValue = oEvent.getParameter("value") || "";
        const sDigits = sValue.replace(/\D/g, "");
        if (sDigits !== sValue) {
          oInput.setValue(sDigits);
          oInput.setValueState("Error");
        } else {
          oInput.setValueState("None");
        }
      },

      _buildPhone: function () {
        const sNumber = this.byId("phoneNumberInput").getValue().trim();
        return sNumber
          ? this.byId("phoneCountryCode").getSelectedKey() + " " + sNumber
          : "";
      },

      _getRevisionFields: function (sRevisionFields) {
        return (sRevisionFields || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      },

      _setReapplyInformation: function (data, aRevisionFields, oAppModel) {
        const mRevisionLabelKeys = {
          phone: "application.phoneLabel",
          country: "application.countryLabel",
          category: "application.categoryLabel",
          taxNumber: "application.taxNumberLabel",
          website: "application.websiteLabel",
          address: "application.addressLabel",
          notes: "application.notesLabel",
          certificate: "application.certificateLabel",
        };
        const sRevisionLabels = aRevisionFields
          .map((sField) => mRevisionLabelKeys[sField])
          .filter(Boolean)
          .map((sKey) => this._oBundle.getText(sKey).replace(/\s*\*$/, ""))
          .join(", ");
        oAppModel.setProperty(
          "/reapplyInfo",
          this._oBundle.getText("application.reapplyInfo", [
            data.rejectionComment || this._oBundle.getText("application.reapplyReasonUnavailable"),
            sRevisionLabels || this._oBundle.getText("application.reapplyFieldsFallback"),
          ]),
        );
        oAppModel.setProperty("/showReapplyInfo", true);

        oAppModel.setProperty("/editableFields", {
          phone: aRevisionFields.includes("phone"),
          country: aRevisionFields.includes("country"),
          category: aRevisionFields.includes("category"),
          taxNumber: aRevisionFields.includes("taxNumber"),
          website: aRevisionFields.includes("website"),
          address: aRevisionFields.includes("address"),
          notes: aRevisionFields.includes("notes"),
        });
      },

      onSubmitPress: async function () {
        const oErrorStrip = this.byId("formError");
        oErrorStrip.setVisible(false);

        const oPayload = this._buildApplicationPayload(oErrorStrip);
        if (!oPayload) {
          return;
        }

        const bReapplyMode = this.getView().getModel("app").getProperty("/isReapplyMode");
        await this._submitApplication(oPayload, bReapplyMode, oErrorStrip);
      },

      _buildApplicationPayload: function (oErrorStrip) {
        const sCompanyName = this.byId("companyNameInput").getValue().trim();
        const sContactPerson = this.byId("contactPersonInput")
          .getValue()
          .trim();

        // --- Frontend validation ---
        if (!sCompanyName || !sContactPerson || !this._sCertificateBase64) {
          oErrorStrip.setText(this._oBundle.getText("application.formValidationError"));
          oErrorStrip.setVisible(true);
          return null;
        }

        return {
          email: this._sEmail,
          companyName: sCompanyName,
          contactPerson: sContactPerson,
          phone: this._buildPhone(),
          country: this.byId("countryInput").getValue(),
          category: this.byId("categorySelect").getSelectedKey(),
          taxNumber: this.byId("taxNumberInput").getValue(),
          website: this.byId("websiteInput").getValue(),
          address: this.byId("addressInput").getValue(),
          notes: this.byId("notesInput").getValue(),
          certificateContent: this._sCertificateBase64,
          certificateFileName: this._sCertificateFileName,
          certificateMimeType: this._sCertificateMimeType,
        };
      },

      _submitApplication: async function (oPayload, bReapplyMode, oErrorStrip) {
        const sAction = bReapplyMode ? "reapplyApplication" : "submitApplication";

        try {
          const response = await fetch("/odata/v4/supplier/" + sAction, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(oPayload),
          });

          const data = await response.json();

          if (!response.ok) {
            oErrorStrip.setText(
              data.error ? errorMapper.map(data.error.message, this._oBundle) : this._oBundle.getText("application.submissionFailedGeneric"),
            );
            oErrorStrip.setVisible(true);
            return;
          }

          MessageToast.show(
            this._oBundle.getText(
              bReapplyMode ? "application.reapplySuccess" : "application.submitSuccess",
            ),
          );
          this.getView().getModel("app").setProperty("/isReapplyMode", false);
          this._checkUserAndStatus();
        } catch (err) {
          oErrorStrip.setText(this._oBundle.getText("common.serverUnreachable"));
          oErrorStrip.setVisible(true);
        }
      },

      onLogout: function () {
        sessionStorage.removeItem("currentUserEmail");
        this.getOwnerComponent().getRouter().navTo("login");
      },
    });
  },
);
