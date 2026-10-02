sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/m/MessageToast",
    "../model/formatter"
], function (Controller, Fragment, JSONModel, Filter, FilterOperator, Sorter, MessageToast, formatter) {
    "use strict";

    const DEFAULT_COLUMNS = {
        phone: false,
        country: false,
        category: false,
        taxNumber: false,
        website: false,
        address: false,
        notes: false
    };
    const STATUS = {
        SUBMITTED: "SUBMITTED",
        APPROVED: "APPROVED",
        REJECTED: "REJECTED"
    };

    return Controller.extend("supplier.approvals.controller.App", {
        formatter: formatter,

        onInit: function () {
            const oUiModel = new JSONModel({
                columns: Object.assign({}, DEFAULT_COLUMNS),
                anyFilterActive: false
            });
            this.getView().setModel(oUiModel, "ui");

            this._oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

            this._sTabKey = "all";
            this._sSearchQuery = "";
            this._sSortPath = null;
            this._bSortDescending = false;
            this._aCategoryFilter = [];
        },

        formatStatusText: function (sStatus) {
            const mStatusKeys = {
                [STATUS.SUBMITTED]: "approvals.statusSubmitted",
                [STATUS.APPROVED]: "approvals.statusApproved",
                [STATUS.REJECTED]: "approvals.statusRejected"
            };
            return this._oBundle.getText(mStatusKeys[sStatus] || "approvals.colStatus");
        },

        formatCategory: function (sCategory) {
            const mCategoryKeys = {
                Hardware: "approvals.categoryHardware",
                Software: "approvals.categorySoftware",
                Services: "approvals.categoryServices",
                Consulting: "approvals.categoryConsulting"
            };
            return mCategoryKeys[sCategory] ? this._oBundle.getText(mCategoryKeys[sCategory]) : sCategory;
        },

        formatSubmissionDate: function (sValue) {
            if (!sValue) {
                return "";
            }

            const sDateValue = typeof sValue === "string"
                ? sValue.match(/^\/Date\((\d+)\)\/$/)?.[1]
                : null;
            const oDate = sValue instanceof Date
                ? sValue
                : new Date(sDateValue ? Number(sDateValue) : sValue);
            if (Number.isNaN(oDate.getTime())) {
                return String(sValue);
            }
            return new Intl.DateTimeFormat(sap.ui.getCore().getConfiguration().getLanguage(), {
                dateStyle: "medium",
                timeStyle: "short"
            }).format(oDate);
        },

        onTabSelect: function (oEvent) {
            this._sTabKey = oEvent.getParameter("key");
            this._applyFiltersAndSort();
            this._updateFilterActiveState();
        },

        onSearch: function (oEvent) {
            this._sSearchQuery = oEvent.getParameter("newValue") || "";
            this._applyFiltersAndSort();
            this._updateFilterActiveState();
        },

        onSettingsPress: async function () {
            if (!this._oSettingsDialog) {
                this._oSettingsDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "supplier.approvals.view.ViewSettings",
                    controller: this
                });
                this.getView().addDependent(this._oSettingsDialog);
            }
            this._oSettingsDialog.open();
        },

        onSettingsConfirm: function (oEvent) {
            const oSortItem = oEvent.getParameter("sortItem");
            this._sSortPath = oSortItem ? oSortItem.getKey() : null;
            this._bSortDescending = oEvent.getParameter("sortDescending") || false;

            const oFilterKeys = oEvent.getParameter("filterKeys") || {};
            this._aCategoryFilter = oFilterKeys.category || [];

            this._applyFiltersAndSort();
            this._updateFilterActiveState();
        },

        onSettingsReset: function () {
            this._aCategoryFilter = [];

            this._applyFiltersAndSort();
            this._updateFilterActiveState();
        },

        onColumnsPress: async function (oEvent) {
            if (!this._oColumnsPopover) {
                this._oColumnsPopover = await Fragment.load({
                    id: this.getView().getId(),
                    name: "supplier.approvals.view.ColumnsSettings",
                    controller: this
                });
                this.getView().addDependent(this._oColumnsPopover);
            }
            this._oColumnsPopover.openBy(oEvent.getSource());
        },

        onColumnToggle: function () {
            this._updateFilterActiveState();
        },

        onClearFilters: function () {
            this._sTabKey = "all";
            this._sSearchQuery = "";
            this._sSortPath = null;
            this._bSortDescending = false;
            this._aCategoryFilter = [];

            this.byId("statusTabBar").setSelectedKey("all");
            this.byId("searchField").setValue("");
            this.getView().getModel("ui").setProperty("/columns", Object.assign({}, DEFAULT_COLUMNS));

            // Discard any dialog with stale internal sort/filter selections; it will be re-created on next open.
            if (this._oSettingsDialog) {
                this._oSettingsDialog.destroy();
                this._oSettingsDialog = null;
            }

            this._applyFiltersAndSort();
            this._updateFilterActiveState();
        },

        _applyFiltersAndSort: function () {
            const aFilters = this._buildFilters();
            const oBinding = this.byId("suppliersTable").getBinding("items");
            oBinding.filter(aFilters.length ? new Filter({ filters: aFilters, and: true }) : []);
            oBinding.sort(this._sSortPath ? new Sorter(this._sSortPath, this._bSortDescending) : new Sorter("submittedAt", true));
        },

        _buildFilters: function () {
            const aFilters = [];

            if (this._sTabKey && this._sTabKey !== "all") {
                aFilters.push(new Filter("status", FilterOperator.EQ, this._sTabKey));
            }

            if (this._sSearchQuery) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("companyName", FilterOperator.Contains, this._sSearchQuery),
                        new Filter("contactPerson", FilterOperator.Contains, this._sSearchQuery),
                        new Filter("email", FilterOperator.Contains, this._sSearchQuery)
                    ],
                    and: false
                }));
            }

            if (this._aCategoryFilter.length > 0) {
                aFilters.push(new Filter({
                    filters: this._aCategoryFilter.map((sCategory) => new Filter("category", FilterOperator.EQ, sCategory)),
                    and: false
                }));
            }

            return aFilters;
        },

        _updateFilterActiveState: function () {
            const bActive =
                this._sTabKey !== "all" ||
                !!this._sSearchQuery ||
                !!this._sSortPath ||
                this._aCategoryFilter.length > 0;

            this.getView().getModel("ui").setProperty("/anyFilterActive", bActive);
        },

        onRowPress: async function (oEvent) {
            if (!this._oSupplierDetailsDialog) {
                if (this._bDialogLoading) {
                    return;
                }
                this._bDialogLoading = true;
                try {
                    const oDialog = await Fragment.load({
                        id: this.getView().getId(),
                        name: "supplier.approvals.view.SupplierDetails",
                        controller: this
                    });
                    this.getView().addDependent(oDialog);
                    this._oSupplierDetailsDialog = oDialog;
                } finally {
                    this._bDialogLoading = false;
                }
                await this._openDialogForContext(oEvent);
                return;
            }

            await this._openDialogForContext(oEvent);
        },

        _openDialogForContext: async function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            const oDialog = this._oSupplierDetailsDialog;
            oDialog.bindElement({
                path: oContext.getPath(),
                parameters: {
                    $select: "ID,companyName,contactPerson,email,phone,country,category,taxNumber," +
                        "website,address,notes,status,submittedAt,rejectionComment,revisionFields,certificateMimeType"
                }
            });
            const oData = await oDialog.getElementBinding().requestObject();

            oDialog.setModel(new JSONModel({
                ...oData,
                showAiMessage: false,
                aiBusy: false,
                aiMessage: "",
                aiMessageType: "Information"
            }), "details");

            oDialog.setModel(new JSONModel({
                active: false,
                comment: "",
                confirmEnabled: false,
                fields: {
                    phone: false,
                    country: false,
                    category: false,
                    taxNumber: false,
                    website: false,
                    address: false,
                    notes: false,
                    certificate: false
                }
            }), "reject");

            this._applyApprovalProcessFlow(oDialog, oData.status);

            oDialog.open();
        },

        _buildApprovalProcessNodes: function (sStatus) {
            const oBundle = this._oBundle;
            const oStates = this._getApprovalProcessStates(sStatus);

            return {
                lanes: [{ laneId: "lane1", text: oBundle.getText("application.processLaneText"), position: 0 }],
                nodes: [
                    {
                        laneId: "lane1", nodeId: "n1", title: oBundle.getText("application.processNodeSubmitted"),
                        state: "Positive", stateText: oBundle.getText("application.processStateCompleted"),
                        texts: [oBundle.getText("application.processReceivedText")], children: ["n2"]
                    },
                    {
                        laneId: "lane1", nodeId: "n2", title: oBundle.getText("application.processNodeInReview"),
                        state: oStates.reviewState, stateText: oStates.reviewStateText,
                        texts: [], children: ["n3"]
                    },
                    {
                        laneId: "lane1", nodeId: "n3", title: oStates.resultTitle,
                        state: oStates.resultState, stateText: oStates.resultStateText,
                        texts: [], children: []
                    }
                ]
            };
        },

        _getApprovalProcessStates: function (sStatus) {
            const oBundle = this._oBundle;
            if (sStatus === STATUS.APPROVED) {
                return {
                    reviewState: "Positive",
                    reviewStateText: oBundle.getText("application.processStateReviewed"),
                    resultState: "Positive",
                    resultStateText: oBundle.getText("application.processNodeApproved"),
                    resultTitle: oBundle.getText("application.processNodeApproved")
                };
            }
            if (sStatus === STATUS.REJECTED) {
                return {
                    reviewState: "Positive",
                    reviewStateText: oBundle.getText("application.processStateReviewed"),
                    resultState: "Negative",
                    resultStateText: oBundle.getText("application.processNodeRejected"),
                    resultTitle: oBundle.getText("application.processNodeRejected")
                };
            }
            return {
                reviewState: "Critical",
                reviewStateText: oBundle.getText("application.processStateInProgress"),
                resultState: "Planned",
                resultStateText: oBundle.getText("application.processStatePending"),
                resultTitle: oBundle.getText("application.processNodeResult")
            };
        },

        _applyApprovalProcessFlow: function (oDialog, sStatus) {
            const oPfModel = oDialog.getModel("pf");
            const oData = this._buildApprovalProcessNodes(sStatus);
            if (oPfModel) {
                oPfModel.setData(oData);
            } else {
                oDialog.setModel(new JSONModel(oData), "pf");
            }
        },

        onDetailsClose: function () {
            this._oSupplierDetailsDialog.close();
        },

        onViewCertificate: function () {
            const sSupplierId = this._oSupplierDetailsDialog.getModel("details").getProperty("/ID");
            const sCertificateUrl = "/odata/v4/supplier/Suppliers(" + encodeURIComponent(sSupplierId) + ")/certificate";
            window.open(sCertificateUrl, "_blank", "noopener,noreferrer");
        },

        onRejectPress: function () {
            this._oSupplierDetailsDialog.getModel("reject").setProperty("/active", true);
        },

        onCancelReject: function () {
            const oRejectModel = this._oSupplierDetailsDialog.getModel("reject");
            oRejectModel.setProperty("/active", false);
            oRejectModel.setProperty("/comment", "");
            oRejectModel.setProperty("/confirmEnabled", false);
            oRejectModel.setProperty("/fields", {
                phone: false,
                country: false,
                category: false,
                taxNumber: false,
                website: false,
                address: false,
                notes: false,
                certificate: false
            });
        },

        onRejectCommentChange: function () {
            this._updateConfirmEnabled();
        },

        onRevisionFieldToggle: function () {
            this._updateConfirmEnabled();
        },

        _updateConfirmEnabled: function () {
            const oRejectModel = this._oSupplierDetailsDialog.getModel("reject");
            const sComment = (oRejectModel.getProperty("/comment") || "").trim();
            const oFields = oRejectModel.getProperty("/fields") || {};
            const bAnyFieldSelected = Object.keys(oFields).some((sKey) => oFields[sKey]);

            oRejectModel.setProperty("/confirmEnabled", !!sComment && bAnyFieldSelected);
        },

        onApprovePress: function () {
            const oDetailsModel = this._oSupplierDetailsDialog.getModel("details");
            this._decide(oDetailsModel.getProperty("/ID"), STATUS.APPROVED, "", "");
        },

        _fetchCsrfToken: async function () {
            const response = await fetch("/odata/v4/supplier/", {
                method: "GET",
                credentials: "same-origin",
                headers: { "X-CSRF-Token": "Fetch" }
            });
            const sCsrfToken = response.headers.get("X-CSRF-Token");
            if (!response.ok || !sCsrfToken) {
                throw new Error(this._oBundle.getText("approvals.toast.csrfUnavailable"));
            }
            return sCsrfToken;
        },

        _postSupplierAction: async function (sAction, oPayload) {
            const sCsrfToken = await this._fetchCsrfToken();
            const response = await fetch("/odata/v4/supplier/" + sAction, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": sCsrfToken
                },
                body: JSON.stringify(oPayload)
            });
            const data = await response.json();
            return { response, data };
        },

        onAnalyzeAI: async function () {
            const oDetailsModel = this._oSupplierDetailsDialog.getModel("details");
            oDetailsModel.setProperty("/aiBusy", true);
            oDetailsModel.setProperty("/showAiMessage", false);

            try {
                const { response, data } = await this._postSupplierAction(
                    "analyzeApplication",
                    { ID: oDetailsModel.getProperty("/ID") }
                );
                if (!response.ok) {
                    throw new Error(data.error?.message || this._oBundle.getText("approvals.toast.aiFailed"));
                }

                const sDecisionText = this._oBundle.getText(
                    data.decision === STATUS.APPROVED ? "approvals.statusApproved" : "approvals.statusRejected"
                );
                oDetailsModel.setProperty("/status", data.decision);
                this._applyApprovalProcessFlow(this._oSupplierDetailsDialog, data.decision);
                oDetailsModel.setProperty(
                    "/rejectionComment",
                    data.decision === STATUS.REJECTED
                        ? `${this._oBundle.getText("approvals.details.aiRejectionPrefix")} ${data.reasoning}`
                        : null
                );
                oDetailsModel.setProperty("/aiMessageType", data.decision === STATUS.APPROVED ? "Success" : "Error");
                oDetailsModel.setProperty(
                    "/aiMessage",
                    this._oBundle.getText("approvals.details.aiResult", [sDecisionText, data.reasoning])
                );
                oDetailsModel.setProperty("/showAiMessage", true);
                this.byId("suppliersTable").getBinding("items").refresh();
            } catch (err) {
                oDetailsModel.setProperty("/aiMessageType", "Error");
                oDetailsModel.setProperty(
                    "/aiMessage",
                    this._oBundle.getText("approvals.details.aiError", [err.message])
                );
                oDetailsModel.setProperty("/showAiMessage", true);
            } finally {
                oDetailsModel.setProperty("/aiBusy", false);
            }
        },

        onConfirmReject: function () {
            const oDetailsModel = this._oSupplierDetailsDialog.getModel("details");
            const oRejectModel = this._oSupplierDetailsDialog.getModel("reject");
            const sComment = (oRejectModel.getProperty("/comment") || "").trim();

            if (!sComment) {
                MessageToast.show(this._oBundle.getText("approvals.toast.commentRequired"));
                return;
            }

            const oFields = oRejectModel.getProperty("/fields") || {};
            const aSelectedKeys = Object.keys(oFields).filter((sKey) => oFields[sKey]);

            if (aSelectedKeys.length === 0) {
                MessageToast.show(this._oBundle.getText("approvals.toast.revisionFieldRequired"));
                return;
            }

            this._decide(oDetailsModel.getProperty("/ID"), STATUS.REJECTED, sComment, aSelectedKeys.join(","));
        },

        _decide: async function (sID, sDecision, sComment, sRevisionFields) {
            try {
                const { response, data } = await this._postSupplierAction("decideApplication", {
                    ID: sID,
                    decision: sDecision,
                    comment: sComment,
                    revisionFields: sRevisionFields
                });

                if (!response.ok) {
                    MessageToast.show(data.error ? data.error.message : this._oBundle.getText("approvals.toast.decisionFailedGeneric"));
                    return;
                }

                MessageToast.show(this._oBundle.getText("approvals.toast.decisionSavedGeneric"));
                this._oSupplierDetailsDialog.close();
                this.byId("suppliersTable").getBinding("items").refresh();
            } catch (err) {
                MessageToast.show(this._oBundle.getText("approvals.toast.serverUnreachable"));
            }
        }
    });
});
