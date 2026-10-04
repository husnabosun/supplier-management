sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../model/errorMapper"
], function (Controller, JSONModel, errorMapper) {
    "use strict";

    return Controller.extend("supplier.portal.controller.Register", {

        onInit: function () {
            const oRulesModel = new JSONModel({
                visible: false,
                minLength: false,
                uppercase: false,
                lowercase: false,
                digit: false,
                special: false
            });
            this.getView().setModel(oRulesModel, "rules");
        },

        onPasswordLiveChange: function (oEvent) {
            const sPassword = oEvent.getParameter("value");
            const oRulesModel = this.getView().getModel("rules");

            oRulesModel.setProperty("/visible", sPassword.length > 0);
            oRulesModel.setProperty("/minLength", sPassword.length >= 8);
            oRulesModel.setProperty("/uppercase", /[A-Z]/.test(sPassword));
            oRulesModel.setProperty("/lowercase", /[a-z]/.test(sPassword));
            oRulesModel.setProperty("/digit", /\d/.test(sPassword));
            oRulesModel.setProperty("/special", /[^A-Za-z0-9]/.test(sPassword));
        },

        onTogglePasswordVisibility: function () {
            const oInput = this.byId("registerPassword");
            const bIsPassword = oInput.getType() === "Password";

            oInput.setType(bIsPassword ? "Text" : "Password");
            const sIcon = bIsPassword ? "sap-icon://hide" : "sap-icon://show";
            oInput.setValueHelpIconSrc(sIcon);
            const oIcon = oInput._getValueHelpIcon && oInput._getValueHelpIcon();
            if (oIcon) {
                oIcon.setSrc(sIcon);
            }
        },

        onRegisterPress: async function () {
            const sEmail = this.byId("registerEmail").getValue();
            const sPassword = this.byId("registerPassword").getValue();
            const oErrorStrip = this.byId("registerError");
            const oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

            oErrorStrip.setVisible(false);

            try {
                const response = await fetch("/odata/v4/supplier/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: sEmail, password: sPassword })
                });

                const data = await response.json();

                if (!response.ok) {
                    oErrorStrip.setText(data.error ? errorMapper.map(data.error.message, oBundle) : oBundle.getText("register.failedGeneric"));
                    oErrorStrip.setVisible(true);
                    return;
                }

                sessionStorage.setItem("currentUserEmail", data.email);

                // Registration success = auto-login -> go straight to the application form.
                this.getOwnerComponent().getRouter().navTo("application");

            } catch (err) {
                oErrorStrip.setText(oBundle.getText("common.serverUnreachable"));
                oErrorStrip.setVisible(true);
            }
        },

        onNavToLogin: function () {
            this.getOwnerComponent().getRouter().navTo("login");
        }
    });
});