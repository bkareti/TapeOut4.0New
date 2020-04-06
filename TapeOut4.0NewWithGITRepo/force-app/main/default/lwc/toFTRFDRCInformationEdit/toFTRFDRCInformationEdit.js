/* eslint-disable no-console */

import { LightningElement, track,api } from "lwc";
import {deleteRecord,updateRecord} from "lightning/uiRecordApi";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

//General Fields import
import TAPEOUT_SERVICE_FORM_ID from "@salesforce/schema/TO_FTRF_Tapeout_Service_Form__c.Id";
//import FTRF_DRC_REQ_FIELD from "@salesforce/schema/TO_FTRF_Tapeout_Service_Form__c.DRC_Request__c";
//import FTRF_PRIME_REQ_FIELD from "@salesforce/schema/TO_FTRF_Tapeout_Service_Form__c.Prime_Request__c";
//DRC information tab fileds
import DRC_OPTION from "@salesforce/schema/TO_FTRF_Tapeout_Service_Form__c.DRC_option__c";
import DRC_CONFIGURATION from "@salesforce/schema/TO_FTRF_Tapeout_Service_Form__c.DRC_Configurations__c";
import DRC_REPORT from "@salesforce/schema/TO_FTRF_Tapeout_Service_Form__c.DRC_Report__c";
import WAIVERS_FOR_ANY_DRC_RULE_VIOLATIONS from "@salesforce/schema/TO_FTRF_Tapeout_Service_Form__c.Waivers_for_any_DRC_rule_violations__c";
import IS_SEVA_VIOLATION_PRESENT from "@salesforce/schema/TO_FTRF_Tapeout_Service_Form__c.Is_SevA_violation_present__c";
import CHECK_WITH_GF_VIOLATIONS_NOT_FIXABLE from "@salesforce/schema/TO_FTRF_Tapeout_Service_Form__c.Check_with_GF_violations_not_fixable__c";
import CASE_NUMBER from "@salesforce/schema/TO_FTRF_Tapeout_Service_Form__c.CASE_Number__c";
import CASE_NUMBER_OTHERS from "@salesforce/schema/TO_FTRF_Tapeout_Service_Form__c.CASE_Number_Others__c";
import RULES_TO_REVIEW from "@salesforce/schema/TO_FTRF_Tapeout_Service_Form__c.Rules_to_Review__c";

//apex controller methods
import getFRTRFTapeoutServiceFromData from "@salesforce/apex/toFTRFTapeoutServiceFormController.getFRTRFTapeoutServiceFromData";
import getProcessObjInfo from "@salesforce/apex/toFTRFTapeoutServiceFormController.getProcessInfo";
import getCaseNumbers from "@salesforce/apex/toFTRFTapeoutServiceFormController.getCaseNumbers";
import getDRCConfigTable from "@salesforce/apex/toFTRFTapeoutServiceFormController.getDRCConfigurationTable";
import getCSVTemplateUrl from "@salesforce/apex/toFTRFTapeoutServiceFormController.getCSVFileTemplateUrl";
import createDRCDeckRules from "@salesforce/apex/toFTRFTapeoutServiceFormController.createDRCDeckRules";
import getListOfDRCDeckRules from "@salesforce/apex/toFTRFTapeoutServiceFormController.getListOfDRCDeckRules";

export default class ToFTRFDRCInformationEdit extends LightningElement {
   /* api decorators */
  @api ftrfServiceFormId;// = "aMJO0000000000BOAQ";
  @api kerfConfigObj = new Map();
  @api fieldLabels = new Map();
  @api configMapData;
  @track isdrcreqchk;// = false;
  @api isprimereqchk;// = false;
  @api geometry;
  @api customerType;
  @api accSubType;
  @api accShortName;
  @api processId;
  @api designManual;
  @api addendumDesignManual;

  /* general variables */
  fileReader;
  fileContents;
 // @track fileUploadMessage;

  /* track decorators */
  @track drcRunSet;
  @track isLabelsLoaded = false;
  @track isconfigTableFound = false;
  @track yesNoOptions = [{ value: "Yes", label: "Yes" },{ value: "No", label: "No" }];

  //DRC Infor Tab Variables
  @track drcOptionValue;
  @track drcOptionFieldOptions = [];
  @track displayDRCOptionValOnly = false;
  @track drcControllerNode;
  @track drcConfigurationsValue = [];
  @track drcRuleViolationValue;
  @track drcRuleViolationOptions = this.yesNoOptions;
  @track drcRuleViolationNote;
  @track drcReportFiles;
  
  @track drcReportAcceptedFormats = [];
  @track SevAViolationValue;
  @track gfTRVerificationValue;
//  @track CASE_Number__c;
  //@track isOnlyCaseFound = false;
  @track caseNumberValue;
  @track caseNumberOptions;
  @track CASE_Number_Others__c;
  @track caseNumberOtherFieldValue;
  @track isVisibleDRCWaiverRequestInformation = false;
  @track rulesToReviewOptions = [{label: "Review Specific rules only", value: "Review Specific rules only"},
                                 { label: "Review ALL rules", value: "Review ALL rules" }];
  @track rulesToReviewValue;
  @track rulesToReviewNote;
  @track rulesToReviewNoteVisible;
  @track displayUploadedFiles = false;
  @track drcConfigurationsTableData;
  @track importCSVModal = false;
  @track importCSVWarning = false;
  @track showImportCSVFileError = false;
  @track selIndex = [];
  @track csvFiles;
  @track csvFileName;
  @track csvTampleteUrl;
  @track isImportdrcRulesClicked= false;
  
  @api 
  get primeDiechips(){
    return this._primeDiechips;
  }
  set primeDiechips(value){
    this._primeDiechips = value;
    this.setChipOption();
  }
  @api 
  get scribeLinechips(){
    return this._scribeLinechips;

  }
  set scribeLinechips(value){
    this._scribeLinechips = value;
    this.setChipOption();
  }
  @track _scribeLinechips = [];
  @track _primeDiechips = [];

  @track chipOptions = [
                        { label: "Test Chip 1", value: "aMIO00000004C93OAE" },
                        { label: "Test Chip 2", value: "aMIO00000004C93OAE" },
                        { label: "Test Chip 3", value: "aMIO00000004C93OAE" }
                      ];
  @track drcRequestRules = [{
                              Id: "",
                              TO_FTRF_Chip__c: "",
                              DRC_Deck_Rule_Name__c: "",
                              Comment_Reason_for_Waiver_Request__c: ""
                            }];

  
  /* Connected Callback */
  connectedCallback(){
    if(this.fieldLabels){
      this.isLabelsLoaded = true;
      console.log('DRC tab this.isLabelsLoaded? '+ this.isLabelsLoaded);
    }

    //get chips from DB Info tab
    
     
    getFRTRFTapeoutServiceFromData({toServiceFormId:this.ftrfServiceFormId})
    .then(data =>{
        console.log('DRC info Tab data from SF is: '+ JSON.stringify(data));
       // this.isPrimeReqChk = data.Prime_Request__c;
       
        if(this.isprimereqchk){
          this.checkDRCRunsetInfo();
        }
        //this.isdrcreqchk = data.DRC_Request__c;
        this.drcOptionValue =data.DRC_option__c;
        this.drcConfigurationsValue = (data.DRC_Configurations__c) ? data.DRC_Configurations__c.split(';') : data.DRC_Configurations__c;
        console.log('this.drcConfigurationsValue from object is: '+ this.drcConfigurationsValue);
        this.getDRCConfigTableData();
       // this.createDRCConfigData();
        this.drcRuleViolationValue = data.Waivers_for_any_DRC_rule_violations__c;
        this.drcReportFiles = data.DRC_Report__c;
        this.SevAViolationValue =  data.Is_SevA_violation_present__c;
        this.gfTRVerificationValue = (data.Check_with_GF_violations_not_fixable__c) ? 'Yes' : 'No';
        this.handlegfTRVerificationCheck();
        this.caseNumberValue = data.CASE_Number__c;
        this.caseNumberOtherFieldValue = data.CASE_Number_Others__c;
        this.rulesToReviewValue = data.Rules_to_Review__c;
        //get DRC Deck rules
        this.getDRCDeckRules(this.ftrfServiceFormId);
    })
    .catch(error =>{
        this.error = error.message;
        this.kerfConfigObj = undefined;
    })
    
}

@api
get isdrcReqcheck(){
  return this.isdrcreqchk;
}

set isdrcReqcheck(value){
  console.log('value in setter method is: '+ value);
  this.isdrcreqchk = value;
}
//update Tapeout service form with DRC Information
@api
updateDRCInfoTab() {
 
  const fields = {};
  fields[TAPEOUT_SERVICE_FORM_ID.fieldApiName] = this.ftrfServiceFormId;
 // fields[FTRF_DRC_REQ_FIELD.fieldApiName] = this.isdrcreqchk;
  //fields[FTRF_PRIME_REQ_FIELD.fieldApiName] = this.isprimereqchk;
  //fields[FTRF_DDR_REQ_FIELD.fieldApiName] = this.isDDRReqChk;
  fields[DRC_OPTION.fieldApiName] = this.drcOptionValue;
  fields[DRC_CONFIGURATION.fieldApiName] = this.drcConfigurationsValue ? this.drcConfigurationsValue.join(";") : [];
  fields[DRC_REPORT.fieldApiName] = this.drcReportFiles;
  fields[WAIVERS_FOR_ANY_DRC_RULE_VIOLATIONS.fieldApiName] = this.drcRuleViolationValue;
  fields[IS_SEVA_VIOLATION_PRESENT.fieldApiName] = this.SevAViolationValue;
  fields[CHECK_WITH_GF_VIOLATIONS_NOT_FIXABLE.fieldApiName] = this.gfTRVerificationValue === "Yes" ? true : false;
  fields[CASE_NUMBER.fieldApiName] = this.caseNumberValue;
  fields[CASE_NUMBER_OTHERS.fieldApiName] = this.caseNumberOtherFieldValue;
  fields[RULES_TO_REVIEW.fieldApiName] = this.rulesToReviewValue;

  const recordInput = { fields };
  updateRecord(recordInput)
    .then(result => {     
      console.log('updated DRC Info Tab');
      //update/create drc deck rules
      this.updateDRCDeckRules(this.drcRequestRules,this.ftrfServiceFormId);
     // console.log("updated record details are : " + JSON.stringify(result));
    })
    .catch(error => {
      console.log("error in updating DRC Info Tab data: " + error.body.message);
        this.dispatchEvent(
          new ShowToastEvent({
            title: "Error updating form record",
            message: error.body.message,
            variant: "error"
          })
        );
    });
}

setChipOption(){
  let chipOptions = [];
    this._scribeLinechips.forEach(ele=>{
      chipOptions.push({label:ele.primeorscribelinename, value:ele.Id});
    });

    this._primeDiechips.forEach(ele=>{
      chipOptions.push({label:ele.primeorscribelinename, value:ele.Id});
    });
  
    this.chipOptions = chipOptions;
    console.log('chipOptions  '+ JSON.stringify(chipOptions));
  
}


 /* DRC Tab handle methods */
  handleDrcOption(event) {
    this.drcOptionValue = event.target.value;
  }

  get drcOptionFieldVisible() {
    return this.isprimereqchk ? true : false;
  }

  checkDRCRunsetInfo() {
    console.log("checkDRCRunsetInfo called");
    getProcessObjInfo({
      processId: this.processId,
      designManual: this.designManual,
      addendumDesingManual: this.addendumDesignManual
    })
      .then(results => {
        this.drcRunSet = results.data;
        console.log("DRC Runset is: ", this.drcRunSet);
        console.log('this.fab is:'+ this.fab );
        console.log('this.geometry is:'+ this.geometry );
        console.log('this.customerType is:'+ this.customerType );
        console.log('this.accSubType is:'+ this.accSubType );
        //if DRC Runset Found
          if (this.drcRunSet) {
            if ( this.fab === "Fab1" || this.drcControllerNode ||
                 (this.geometry === 0.014 && this.customerType === "Customer") ||
                 (this.geometry === 0.014 &&
                  this.customerType === "GLOBALFOUNDRIES Internal" && this.accSubType === "DE-IP")
            ) {
              this.drcOptionFieldOptions = [];
              this.drcOptionFieldOptions = this.generateOptions('Foundry run and gating mask release','|',true);
              this.drcOptionValue = "Foundry run and gating mask release";
              //Only 1 option found , displays one value
              this.displayDRCOptionValOnly = (this.drcOptionFieldOptions.length === 1) ? true : false; 
            }
          } else if (!this.drcRunSet) {
            this.drcOptionFieldOptions = [];
            this.drcOptionFieldOptions =this.generateOptions('Customer proprietary Design Rule and DRC review not applicable','|',true);
            this.drcOptionValue = "Customer proprietary Design Rule and DRC review not applicable";
            //Only 1 option found , displays one value
            this.displayDRCOptionValOnly = (this.drcOptionFieldOptions.length === 1) ? true : false;
          } else {
            this.drcOptionFieldOptions = [];
            let options = "Foundry run and gating mask release|Foundry run and not gating mask release|Customer proprietary Design Rule and DRC review not applicable";
            this.drcOptionFieldOptions = this.generateOptions(options,'|',true);
            //Only 1 option found , displays one value
            this.displayDRCOptionValOnly = (this.drcOptionFieldOptions.length === 1) ? true : false;
          }
        
      })
      .catch(error => {
        this.error = error;
      });
    
  }

  //show or hide drc Cofiguarations
  get DRCConfigurationsFieldVisible() {
    console.log('this.isdrcreqchk '+ this.isdrcreqchk);
    console.log('this.isprimereqchk '+ this.isprimereqchk);
    console.log('this.isconfigTableFound' + this.isconfigTableFound);
    let result = false;   
    let drcVal = this.drcOptionValue !== "Customer proprietary Design Rule and DRC review not applicable" ? true : false;
   
    if (this.isprimereqchk && this.isconfigTableFound && drcVal) {
       result = true;
    } else if (this.isdrcreqchk && this.isconfigTableFound) {
      result = true;
    } else {
      result = false;
    }
    console.log("DRCConfigurationsFieldVisible value: " + result);
    return result;
  }

  handleDRCConfigurations(event) {
    // DRC Configuration table values will be saved as string
    // in FTRF Tapeout Services form object field DrcConfigurations
    // sample formate is : configTableName1:Option;configTableName1:Option
    let selIndex = event.target.dataset.record;
    let selOption = event.target.value;
    let drcConfigData = this.drcConfigurationsTableData.listOfConfigTables;
    console.log("Selected Index is: " + selIndex);
    console.log("Selected selOption is: " + selOption);
    let selRow = drcConfigData[selIndex];
    console.log('selected row is: '+ selRow);
    let arrObj = [];
    let val = selRow.ctMasterConfigName + ":" + selOption;
    console.log('selected val is: '+ val);
    arrObj.push(val);
    if (this.drcConfigurationsValue) {
      this.drcConfigurationsValue[selIndex] = val;
    } else if (!this.drcConfigurationsValue) {
      this.drcConfigurationsValue = arrObj;
    }
    console.log(" arrObj is: " + JSON.stringify(this.drcConfigurationsValue));
  }


  // General methods
  // function to find available DRC configuration table data.
  getDRCConfigTableData() {
    let pValue = "DM-000432"; //SCT-0002'// this.addendumDesignManual;
    console.log("this.addendumDesignManual value is: " + pValue);
    getDRCConfigTable({ configSpecName: pValue })
      .then(results => {
        console.log("configTable method called");
        if (results) {
          this.drcConfigurationsTableData = results;
          this.isconfigTableFound = true;
          this.drcControllerNode = this.drcConfigurationsTableData.scControlledNode;
          console.log('drcControllerNode is: '+ this.drcControllerNode );
          console.log("configuration table data is : " + JSON.stringify(this.drcConfigurationsTableData));
          //if existing config table data found runs createDRCConfigData method
          if(this.drcConfigurationsValue){
            this.createDRCConfigData();
          }
        }
      })
      .catch(error => {
        this.error = error;
        this.isconfigTableFound = false;
        console.log("configTable method called if error", JSON.stringify(this.error));
      });
  }

   // method to generate option with mapKey and seperator
   generateOptions(mKey,separator,isOnlyOptions) {
    let options = [];
    console.log("mapKey is :" + mKey);
    let values = this.configMapData[mKey];
    console.log("map values are: " + values);

    //isOnlyOptions is true, it generated optiond based on string 
    if(isOnlyOptions){
      let vals = mKey.split(separator);
      console.log('vals if isOnlyOptions is true'+JSON.stringify(vals));
      vals.forEach(ele=>{
        options = [...options, { label: ele, value: ele }];
      })
      console.log('options are if isOnlyOptions is true: '+ JSON.stringify(options));
      
    /*it generates options if values found 
     in configMap with MapKey */
    }else if (values) {
      values = values.split(separator);
      values.forEach(ele=>{
        options = [...options, { label: ele, value: ele }];
      })
    } else {
      options = [{ label: "System Error", value: "System Error" }];
    }
    return options;
  }

   // methid to delete files
   handleToDelteFiles(lstOfFileIds) {
    let fileIds = lstOfFileIds.split(",");
    for (let i = 0; i < fileIds.length; i++) {
      //delete selected file
      deleteRecord(fileIds[i])
        .then(() => {})
        .catch(error => {
          this.error = error.message;
          console.log(
            "Error in Deleting File from salesforce : " + JSON.stringify(error)
          );
        });
    }
  }

  //method to save DRC rules in DRC Deck Rule object
  updateDRCDeckRules(lstOfDRCRules, formId) {
    console.log("list of DRC rules are:" + lstOfDRCRules);
    console.log("tapeOut form id is" + formId);
    createDRCDeckRules({ lstOfRulesObj: lstOfDRCRules, tapeoutformId: formId })
      .then((result) => {
        console.log('inserted deck rules details are: '+ JSON.stringify(result));
        console.log("In update deck rules method");
      })
      .catch(error => {
        console.log(
          "Error in updating deck rules method: " + error.body.message
        );
      });
  }

  //get DRC Deck Rules to update form
  getDRCDeckRules(tSFormId) {
    getListOfDRCDeckRules({ tapeoutServicesFormId: tSFormId })
      .then(response => {
        if (response !== undefined && response.length > 0) {
          let rows = [];
          for (let i = 0; i < response.length; i++) {
            let row = response[i];
            let obj = {
              Id: row.Id,
              TO_FTRF_Chip__c: row.TO_FTRF_Chip__c,
              DRC_Deck_Rule_Name__c: row.DRC_Deck_Rule_Name__c,
              Comment_Reason_for_Waiver_Request__c:
                row.Comment_Reason_for_Waiver_Request__c
            };
            rows.push(obj);
          }
          console.log(
            "response in getListOfDRCDeckRules:" + JSON.stringify(response)
          );
          console.log("getListOfDRCDeckRules length is:" + response.length);
          this.drcRequestRules = [];
          this.drcRequestRules = rows;
          console.log(
            "drcRequestRules in getListOfDRCDeckRules are:" +
              JSON.stringify(this.drcRequestRules)
          );
        }
      })
      .catch(error => {
        console.log("error in getting DRC Deck rules is: " + error.message);
      });
  }

  //method to add existing DRC Configuration values from Object to DRC Figuration table data to show in update form
  createDRCConfigData() {
    
    let drcConfigData = this.drcConfigurationsTableData.listOfConfigTables;
    if (drcConfigData!== undefined) {
      console.log('this.drcConfigurationsTableData.listOfConfigTables.length is '+ JSON.stringify(drcConfigData));
      
      for (let i = 0; i < drcConfigData.length; i++) {
        let optVal = this.drcConfigurationsValue[i]?this.drcConfigurationsValue[i].split(":"):'ErrorDRCValue';
        console.log("optVal is: " + optVal);
        if (optVal !== undefined) {
          if (drcConfigData[i].ctMasterConfigName === optVal[0]) {
              console.log("config type is matched");
              drcConfigData[i].listOfOptions.forEach(ele => {
                     ele.default = ele.optName === optVal[1] ? true : false;
                  });
          }
        }
      }
    }
    console.log("constructed DRC Configuration data is: " + JSON.stringify(drcConfigData));
  }

  //method is to show success message

  showToast(title, variant, msg) {
    console.log("success massage is: " + msg);
    console.log("variant massage is: " + variant);
    console.log("title massage is: " + title);
    this.dispatchEvent(
      new ShowToastEvent({
        title: title,
        message: msg,
        variant: variant
      })
    );
  }

  // methods to delete recods
  deleteRecords(recordId) {
    deleteRecord(recordId)
      .then(() => {
        console.log("successfully deleted record: " + recordId);
      })
      .catch(error => {
        this.error = error.message;
        console.log(
          "Error in Deleting record from salesforce : " + JSON.stringify(error)
        );
      });
  }

  get ShowWaiversForAnyDRCRuleViolations() {
    return (this.isdrcreqchk ) ? true : false;
  }

  handleDRCRuleViolation(event) {
    this.drcRuleViolationValue = event.target.value;
    // if toggled from Yes to No value clear prev values
    console.log('drcRuleViolationValue is: '+  this.drcRuleViolationValue);
    if(this.drcRuleViolationValue === "No"){
      //delete DRC Report Uploaded
      this.deleteUploadedFile(this.drcReportFiles);
      //delete Does your design contain Sev A violation? value 
      this.SevAViolationValue = '';
      //delete Does your design contain Sev A violation? value
      this.gfTRVerificationValue = '';
    }
  }

  get drcRuleViolationNoteVisible() {
    let result;
    if (this.drcRuleViolationValue === "Yes") {
       result = true;
    } else if (this.drcRuleViolationValue === "No") {
      result = false;
    }
    return result;
  }

  get showDRCReportField() {
    return this.drcRuleViolationValue === "Yes" ? true : false;
  }

  handleDRCReportUpload(event) {
    this.drcReportFiles = event.detail;
    console.log("uploaded files are : " + JSON.stringify(this.drcReportFiles));
  }

  
  get ShowIsSevAViolationPresentField() {
    return this.drcRuleViolationValue === "Yes" ? true : false;
  }

  handleSevAViolationFiled(event) {
    this.SevAViolationValue = event.target.value;
  }

  get showGetTRVerificationCheck() {
    return this.isdrcreqchk &&
      this.drcRuleViolationValue === "Yes" &&
      this.drcConfigurationsTableData && this.drcControllerNode
      ? true
      : false;
  }

  handlegfTRVerificationCheck(event) {
    if (event !== undefined) {
      this.gfTRVerificationValue = event.target.value;
    }
    if (this.gfTRVerificationValue === "Yes") {
      //get case numbers
      //check DRC RunSet with apex method
      getCaseNumbers({ accShortName: this.accShortName })
        .then(results => {
          if (results.data) {
            let lst = results.data;
            this.caseNumberOptions = [];
            for (let i = 0; i < lst.length; i++) {
              this.caseNumberOptions = [...this.caseNumberOptions,{ value: lst[i], label: lst[i] }];
            }
          } else {
            this.caseNumberOptions = [];
            this.caseNumberOptions = [...this.caseNumberOptions,{ value: "No Cases", label: "No Cases" }];
            this.caseNumberValue = "No Cases Found";
            //this.isOnlyCaseFound = true;
          }
        })
        .catch(error => {
          this.error = error;
          console.log("error in get Case number method",JSON.stringify(this.error));
        });
    }else if(this.gfTRVerificationValue === "No"){
      this.caseNumberOptions = [];
      this.caseNumberValue = '';
    }
  }

  get isOnlyCaseFound(){
      let i = false;
      if(this.caseNumberOptions && this.caseNumberOptions.length === 1){
        i = true;
        this.caseNumberValue = this.caseNumberOptions[0].value;
      }else if(this.caseNumberOptions && this.caseNumberOptions.length > 1){
        i = false;
      }
      return i;
  }

  get showCaseNumberField() {
    return this.gfTRVerificationValue === "Yes" ? true : false;
  }

  handleCaseNumberField(event) {
    this.caseNumberValue = event.target.value;
  }

  get showCaseNumberOtherField() {
    return this.gfTRVerificationValue === "No" ? true : false;
  }
  handleCaseNumberOtherField(event) {
    this.caseNumberOtherFieldValue = event.target.value;
  }

  get showDRCWaiverRequestInformation() {
    let result;
    if (this.drcRuleViolationValue === "Yes" && this.isdrcreqchk) {
      result = true;
    } else if(this.drcRuleViolationValue === "No"){
      this.rulesToReviewValue = '';
      result = false;
    }
    return result;
  }
  handleRulesToReview(event) {
    this.rulesToReviewValue = event.target.value;
    //display Note
    if (this.rulesToReviewValue === "Review Specific rules only") {
      this.rulesToReviewNoteVisible = true;
    } else if (this.rulesToReviewValue === "Review ALL rules") {
      this.rulesToReviewNoteVisible = false;
    }
  }

  get showDRCWaiverRequestRulesTable() {
    let result;
    if (
      this.isdrcreqchk &&
      this.rulesToReviewValue === "Review Specific rules only"
    ) {
      result = true;
    } else {
      result = false;
      this.rulesToReviewValue = null;
    }
    return result;
  }

  handleAddDRCWRRule() {
    let len = this.drcRequestRules.length;
    let rows = this.drcRequestRules;
    let addCol = [
      {
        Id: null,
        TO_FTRF_Chip__c: "",
        DRC_Deck_Rule_Name__c: "",
        Comment_Reason_for_Waiver_Request__c: ""
      }
    ];
    rows.splice(len, 0, addCol);
    this.drcRequestRules = rows;
    console.log(
      "rulesCol after addition is: " + JSON.stringify(this.drcRequestRules)
    );
  }
  
  /*
  This handler is used to delete selected single/ multiple rows 
  from DRC rules table 
  */

  handleDeleteDRCWRRule() {
    //console.log("selected index is: " + this.selIndex);
    let rows = this.drcRequestRules;
    let deckRuleIdsToDelete = [];
    let selIndex = this.selIndex;
    //console.log("selected index is: " + selIndex);
    
    selIndex.forEach(index =>{
        //console.log('index in forEach is: '+ index);
      if (rows[index].Id !== undefined) {
        deckRuleIdsToDelete.push(rows[index].Id);
      }
      rows.splice(index, 1);
    });
    this.drcRequestRules = rows;
    this.selIndex = [];
    
    //console.log("this.drcRequestRules after delete is; " + JSON.stringify(rows));

    //delete drc deck rule record 
    if (deckRuleIdsToDelete.length > 0) {
        deckRuleIdsToDelete.forEach(fileId =>{
          this.deleteRecords(fileId);
        })
    }

  }

  /*
  this handler is used to copy selected single/multiple DRC rules 
  from DRC table using checkboxes
  */
  handleCopyDRCWRRule() {
    let rows = this.drcRequestRules;
    console.log('this.drcRequestRules already present are: '+ JSON.stringify(this.drcRequestRules));
    console.log('this.selIndex: '+ this.selIndex);
    let copyToRowNum;
   
    for (let i = 0; i < this.selIndex.length; i++) {
     copyToRowNum = rows.length;
     console.log('cuurent row length is: '+copyToRowNum);
      let addCol = [
        {
          Id: rows[this.selIndex[i]].Id,
          TO_FTRF_Chip__c: rows[this.selIndex[i]].TO_FTRF_Chip__c,
          DRC_Deck_Rule_Name__c: rows[this.selIndex[i]].DRC_Deck_Rule_Name__c,
          Comment_Reason_for_Waiver_Request__c:
            rows[this.selIndex[i]].Comment_Reason_for_Waiver_Request__c
        }
      ];
      rows.splice(copyToRowNum, 0, addCol[0]);
    }
    this.drcRequestRules= [];
    this.drcRequestRules = rows;
    console.log("drcRequestRules after added copied values: " +JSON.stringify(this.drcRequestRules));
  }

  /*
  this Handlers is used to get the Index of selected rows
  of DRC Rule Table
  */

  handleCheckBox(event) {
    let selectedIndex = event.target.dataset.record;
    let e = event.target.checked;
    //console.log("ev  is:" + e);
    if (e) {
      //console.log("selected index is: " + selectedIndex);
      this.selIndex.push(selectedIndex);
      //console.log("list of selected index is: " + this.selIndex);
    } else if (!e) {
      let index = this.selIndex.indexOf(selectedIndex);
      this.selIndex.splice(index, 1);
      //console.log("list of selected index is: " + this.selIndex);
    }
  }

  handleChipNameinRuleTable(event) {
    let val = event.target.value;
    let rowIndex = event.target.dataset.record;
    let rows = this.drcRequestRules;
    let obj = {};
    //check existing row number and assing new
    if (
      this.drcRequestRules.length > 1 &&
      this.drcRequestRules[rowIndex].TO_FTRF_Chip__c !== undefined
    ) {
      obj = this.drcRequestRules[rowIndex];
    } else {
      obj = {
        Id: null,
        TO_FTRF_Chip__c: "",
        DRC_Deck_Rule_Name__c: "",
        Comment_Reason_for_Waiver_Request__c: ""
      };
    }
   // console.log("values is: " + val);
    //console.log("row is: " + rowIndex);
    obj.TO_FTRF_Chip__c = val;
    rows[rowIndex] = obj;
    this.drcRequestRules = rows;
   // console.log(" this.drcRequestRules rule values are: " +JSON.stringify(this.drcRequestRules));
  }

  hadleDRCDeckRuleName(event) {
    let val = event.target.value;
    let row = event.target.dataset.record;
    let rows = this.drcRequestRules;
    let obj = this.drcRequestRules[row];
    console.log("values is: " + val);
    console.log("row is: " + row);
    obj.DRC_Deck_Rule_Name__c = val;
    rows[row] = obj;
    this.drcRequestRules = rows;
    console.log(
      "this.drcRequestRules   values are: " +
        JSON.stringify(this.drcRequestRules)
    );
  }

  hadleDRCDeckRuleComment(event) {
    let val = event.target.value;
    let row = event.target.dataset.record;
    let rows = this.drcRequestRules;
    let obj = this.drcRequestRules[row];
    console.log("values is: " + val);
    console.log("row is: " + row);
    obj.Comment_Reason_for_Waiver_Request__c = val;
    rows[row] = obj;
    this.drcRequestRules = rows;
    console.log(
      "this.drcRequestRules values are: " + JSON.stringify(this.drcRequestRules)
    );
  }

  handleimportCSVButton() {
    let val = this.drcRequestRules.length;
    let data = this.drcRequestRules;
    console.log('val is:'+ val);
    console.log('data: '+ data);
    //warning if table has values
    if (
      (val =
        1 &&
        (data[0].ChipName !== "" ||
          data[0].Rule !== "" ||
          data[0].Comment !== "")) ||
      val > 1
    ) {
      this.importCSVWarning = true;
    } else {
      this.importCSVModal = true;
      this.importCSVWarning = false;
    }
  }
  handleProceedImportWarning() {
    this.importCSVModal = true;
    this.importCSVWarning = false;
  }

  handleCancelImportWarning() {
    this.importCSVWarning = false;
  }

  handleCancelImport() {
    this.importCSVModal = false;
  }

  /*
    1.this methid is used to import DRC Deck rules from CSV file
    2. it validates chip Names in csv file with chips selected in Database information, if not maches throws error and import will not happen
    */
  handleImportCSVFileToRulesTable() {
    //import csv file data to rule table
    console.log('clicked on impoer button');
    this.fileReader = new FileReader();
    this.fileReader.readAsText(this.csvFiles);
    this.fileReader.onload = () => {
      this.fileContents = this.fileReader.result;
      this.fileContents = this.fileContents.split("\r\n");
      console.log('splitted rows r and n are:'+ JSON.stringify(this.fileContents));
      let fileLength = this.fileContents.length - 1;
      let rows = [];
      let isValidFile = true;
      for (let i = 1; i < fileLength; i++) {
        let row = this.fileContents[i].split(",");
        let chipId = this.chipOptions.filter(chip => chip.label === row[0]);
        if (chipId[0] !== undefined) {
          let obj = {
            Id: null,
            TO_FTRF_Chip__c: chipId[0].value,
            DRC_Deck_Rule_Name__c: row[1],
            Comment_Reason_for_Waiver_Request__c: row[2]
          };
          rows.push(obj);
        } else if (chipId[0] === undefined) {
          isValidFile = false;
        }
      }
      console.log('isValidFile? '+isValidFile);
      console.log(
        "extracted rows from imported csv file are:" + JSON.stringify(rows)
      );

      if (isValidFile) {
        //delete existing deck rules from object
        if( this.drcRequestRules){
          console.log('this.drcRequestRules'+ this.drcRequestRules);
        //  this.drcRequestRules.forEach(rule => this.deleteRecords(rule.Id));
        }
       
        //clear existing deck rules
        this.drcRequestRules = [];
        this.drcRequestRules = rows;
        this.importCSVModal = false;
        this.showImportCSVFileError = false;
        //Success toast message prams:title,variant,message
        let successMsg = this.fieldLabels.ImportCSV_File.Success_message__c;
        this.showToast("Success", "success", successMsg);
      } else {
        this.importCSVModal = true;
        this.showImportCSVFileError = true;
      }
      console.log(
        "drcRequestRules are:" + JSON.stringify(this.drcRequestRules)
      );
    };
  }

  //import past DRC rules
  handleImportPastRules(){
    console.log('clicked import past rules button');
    this.isImportdrcRulesClicked = true;
  }

  handleAddChipsCloseModal(event){
    this.isImportdrcRulesClicked= event.detail.close;
  }

  hanldeFileUpload(event) {
    const uploadedFiles = event.target.files;
    let inputField = event.target;
    let fileName = uploadedFiles[0].name;
    console.log("uploaded csv files are: " + JSON.stringify(uploadedFiles[0]));
    // validate file type
    console.log("file name is:" + fileName);
    if (!fileName.endsWith(".csv")) {
      inputField.setCustomValidity(
        this.fieldLabels.ImportCSV_File.CondErrorMsg1__c
      );
    } else {
      this.csvFiles = uploadedFiles[0];
      this.csvFileName = fileName;
    }
    inputField.reportValidity();
  }

  get csvTamplateUrl() {
    //console.log('cliked on hyper link');
    getCSVTemplateUrl()
      .then(results => {
        console.log("got results");
        if (results) {
          console.log("results is: " + JSON.stringify(results));
          this.csvTampleteUrl = results;
          this.error = undefined;
        }
      })
      .catch(error => {
        this.error = error.message;
        this.csvTampleteUrl = undefined;
        console.log("error in CSV Template is : " + this.error);
      });
    return this.csvTampleteUrl;
  }

  //import csv accepted formates
  get acceptedFormats() {
    return [".csv"];
  }

  //deletes file
  deleteUploadedFile(docId){
    console.log('Id of uploaded file to delete is: '+docId);
    deleteRecord(docId)
        .then((result) => {
          console.log('deleted file details are: '+JSON.stringify(result));
        })
        .catch(error => {
            this.error = error.message;
            console.log('Error in deleting uploaded file is: '+JSON.stringify(error.message));
        });   
}

//Handles selected rules from import Rules  
handleSelectedChips(event){
   let newRules = event.detail.selectedChip;
   console.log('Selected Forms are : '+ JSON.stringify(newRules));
   //add new rules to Existing DRC Rules in current Tapeout service form
   let tempObj = [];
   newRules.forEach(ele => {
    let obj = {
      Id: null,
      TO_FTRF_Chip__c: ele.TO_FTRF_Chip__c,
      DRC_Deck_Rule_Name__c: ele.DRC_Deck_Rule_Name__c,
      Comment_Reason_for_Waiver_Request__c: ele.Comment_Reason_for_Waiver_Request__c
    };
    //this.drcRequestRules.push(obj);
    tempObj.push(obj);
   });
   console.log('this.drcRequestRules[0].TO_FTRF_Chip__c value is '+this.drcRequestRules[0].TO_FTRF_Chip__c);

   if(this.drcRequestRules.length === 1 && this.drcRequestRules[0].TO_FTRF_Chip__c === ''){
    this.drcRequestRules = [];
    this.drcRequestRules = tempObj;
   }else{
    tempObj.forEach(ele=>{
      this.drcRequestRules.push(ele);
    })
    
   }

}
 
@api 
checkValidation() {
    const allValidCombobox = [...this.template.querySelectorAll('lightning-combobox')]
    .reduce((validSoFar, inputCmp) => {
        inputCmp.reportValidity();
        return validSoFar && inputCmp.checkValidity();
    }, true);
    const allValidInputType = [...this.template.querySelectorAll('lightning-input')]    
    .reduce((validSoFar, inputCmp) => {
        inputCmp.reportValidity();
        console.log('allValidInputType:'+allValidInputType+ ' validSoFar:'+validSoFar);
        console.log('inputCmp:'+inputCmp.checkValidity());
        return validSoFar && inputCmp.checkValidity();
    }, true);
    let allValidInputType2 = true; 
    let template = this.template.querySelectorAll('lightning-input');
    template.forEach(ele => { 	
      if(!ele.checkValidity()) { 		
        allValidInputType2 = ele.checkValidity(); 	
      } 	
      console.log('allValidInputType2 : '+allValidInputType2); });
    //const allValidInputType = [...this.template.querySelectorAll('lightning-input')]    
    //Validate DRC Tab
    let allDRCTabInValid = true;
    let drcTab = this.template.querySelectorAll("c-to-ftrf-import-drc-rules");
    if(drcTab) {
      drcTab.forEach(element => {
        allDRCTabInValid = element.checkValidation();
        console.log('Called from TODRCTab:'+allDRCTabInValid);
        /*if (!element.checkValidation()) {          
        }*/
      });
    }
    console.log('Hi allDRCTabInValid:'+allDRCTabInValid);
    return allValidCombobox && allValidInputType && allDRCTabInValid && allValidInputType2;
}

}