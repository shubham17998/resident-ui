import { Component, OnInit, OnDestroy, ViewEncapsulation } from "@angular/core";
import { MatDialog } from "@angular/material";
import { DataStorageService } from "src/app/core/services/data-storage.service";
import { RegistrationCentre } from "./registration-center-details.model";
import { Router, ActivatedRoute } from "@angular/router";
import { DialogComponent } from 'src/app/shared/dialog/dialog.component';
import { BookingService } from "../booking.service";
import { TranslateService } from "@ngx-translate/core";
import * as appConstants from "./../../../app.constants";
import { Subscription } from "rxjs";
import { saveAs } from 'file-saver';
import { AuditService } from "src/app/core/services/audit.service";

@Component({
  selector: "app-center-selection",
  templateUrl: "./center-selection.component.html",
  styleUrls: ["./center-selection.component.css"]
})
export class CenterSelectionComponent implements OnInit, OnDestroy {
  REGISTRATION_CENTRES: RegistrationCentre[] = [];
  searchClick: boolean = false;
  isWorkingDaysAvailable = false;
  canDeactivateFlag = true;
  locationTypes = [];
  identityData = [];
  allLocationTypes = [];
  locationType = null;
  searchText = null;
  showTable = false;
  selectedCentre = null;
  showMap = false;
  showMessage = false;
  enableNextButton = false;
  bookingDataList = [];
  errorlabels: any;
  nearbyClicked = false;
  apiErrorCodes: any;
  step = 0;
  textDir = localStorage.getItem("dir");
  showDescription = false;
  mapProvider = "OSM";
  searchTextFlag = false;
  displayMessage = "Showing nearby registration centers";
  subscriptions: Subscription[] = [];
  langCode = localStorage.getItem("langCode");
  workingDays: string;
  preRegId = [];
  recommendedCenterLocCode = 1;
  locationNames = [];
  locationCodes = [];
  showFirstLastButtons:any = true
  // MatPaginator Inputs
  totalItems = 0;
  defaultPageSize = 5;
  pageSize = this.defaultPageSize;
  pageIndex = 0;
  pageSizeOptions: number[] = [5, 10, 15, 20];
  centerSelection: any;
  isBlankSpace:boolean = true;
  showWarningMsg:boolean = false;
  showMesssageText:string="";
  popupMessages: any;

  constructor(
    public dialog: MatDialog,
    private service: BookingService,
    private dataService: DataStorageService,
    private router: Router,
    private route: ActivatedRoute,
    private translate: TranslateService,
    private activatedRoute: ActivatedRoute,
    private auditService: AuditService
  ) {
    this.translate.use(this.langCode);
  }

  async ngOnInit() {
    /*if (this.router.url.includes("multiappointment")) {
      this.preRegId = [...JSON.parse(localStorage.getItem("multiappointment"))];
    } else {
      this.activatedRoute.params.subscribe((param) => {
        this.preRegId = [param["appId"]];
      });
    }
    this.getErrorLabels();
    await this.getUserInfo(this.preRegId);
    this.REGISTRATION_CENTRES = [];
    this.selectedCentre = null;
    this.recommendedCenterLocCode = Number(this.configService.getConfigByKey(
      appConstants.CONFIG_KEYS.preregistration_recommended_centers_locCode
    ));
    console.log(`recommendedCenterLocCode: ${this.recommendedCenterLocCode}`);*/
    //await this.getIdentityJsonFormat();
    //this.openDialog();
    this.recommendedCenterLocCode = 5;
    const subs = this.dataService
      .getLocationHierarchyLevel("eng")
      .subscribe((response) => {
        //get all location types from db
        this.allLocationTypes = response[appConstants.RESPONSE]["locationHierarchyLevels"];
        //get the recommended loc hierachy code to which booking centers are mapped        
        //now filter out only those hierachies which are higher than the recommended loc hierachy code
        //ex: if locHierachy is ["Country","Region","Province","City","PostalCode"] and the
        //recommended loc hierachy code is 3 for "City", then show only "Country","Region","Province"
        //in the Search dropdown. There are no booking centers mapped to "PostalCode", so don't include it.
        this.locationTypes = this.allLocationTypes.filter(
          (locType) =>
            locType.hierarchyLevel <= this.recommendedCenterLocCode
        );
        //sort the filtered array in ascending order of hierarchyLevel
        this.locationTypes.sort(function (a, b) {
          return a.hierarchyLevel - b.hierarchylevel;
        });
        this.getRecommendedCenters();
      });
    this.subscriptions.push(subs);
    this.getLocation();
    this.getErrorLabels();
  }

  /*getUserInfo(preRegId) {
    return new Promise(async (resolve) => {
      for (let i = 0; i < preRegId.length; i++) {
        await this.getUserDetails(preRegId[i]).then((user) =>
          this.users.push(user)
        );
      }
      resolve(true);
    });
  }

  getUserDetails(prid) {
    return new Promise((resolve) => {
      this.dataService.getUser(prid.toString()).subscribe((response) => {
        resolve(
          new UserModel(
            prid.toString(),
            response[appConstants.RESPONSE],
            undefined,
            []
          )
        );
      });
    });
  }*/

  getErrorLabels() {
    this.dataService.getI18NLanguageFiles(localStorage.getItem('langCode')).subscribe((response) => {
      this.errorlabels = response["error"];
      this.apiErrorCodes = response[appConstants.API_ERROR_CODES];
      this.popupMessages = response;
    });
  }
  /**
     * @description This method will get the Identity Schema Json
     */
  /*async getIdentityJsonFormat() {
   return new Promise((resolve, reject) => {
     this.dataService.getIdentityJson().subscribe(
       async (response) => {
         //response = identityStubJson;
         //console.log(identityStubJson);
         let identityJsonSpec =
           response[appConstants.RESPONSE]["jsonSpec"]["identity"];
         this.identityData = identityJsonSpec["identity"];
         resolve(true);
       },
       (error) => {
         this.showErrorMessage(error);
       }
     );
   });
 }*/

  async getRecommendedCenters() {
    //console.log("getRecommendedCenters");
    this.totalItems = 0;
    this.nearbyClicked = false;
    let uiFieldName = null;
    this.identityData.forEach((obj) => {
      if (
        obj.inputRequired === true &&
        obj.controlType !== null &&
        !(obj.controlType === "fileupload")
      ) {
        if (obj.locationHierarchyLevel && this.recommendedCenterLocCode == obj.locationHierarchyLevel) {
          uiFieldName = obj.id;
        }
      }
    });
    /* if (!uiFieldName) {
       //this.showErrorMessage(null, this.errorlabels.error);
     } else {*/
    /*this.users.forEach((user) => {
      //console.log(typeof user.request.demographicDetails.identity[uiFieldName]);
      if (
        typeof user.request.demographicDetails.identity[uiFieldName] ===
        "object"
      ) {
        //console.log(user.request.demographicDetails.identity[uiFieldName][0].value);
        this.locationCodes.push(
          user.request.demographicDetails.identity[uiFieldName][0].value
        );
      } else if (
        typeof user.request.demographicDetails.identity[uiFieldName] ===
        "string"
      ) {
        //console.log(user.request.demographicDetails.identity[uiFieldName]);
        this.locationCodes.push(
          user.request.demographicDetails.identity[uiFieldName]
        );
      }
    });*/
    //console.log(this.locationCodes);
    //this.getRecommendedCentersApiCall();
    this.showTable = true;
    this.isWorkingDaysAvailable = true;
    await this.getLocationNamesByCodes();

    /*}*/
  }

  getLocationNamesByCodes() {
    return new Promise((resolve) => {
      this.locationCodes.forEach(async (pins, index) => {
        //console.log(pins);
        await this.getLocationNames(pins);
        if (index === this.locationCodes.length - 1) {
          resolve(true);
        }
      });
    });
  }

  getRecommendedCentersApiCall() {
    this.REGISTRATION_CENTRES = [];
    const subs = this.dataService
      .recommendedCenters(
        this.langCode,
        5,
        ["14022"]
      )
      .subscribe((response) => {
        if (response[appConstants.RESPONSE]) {
          this.displayResults(response["response"]);
        }
      },
        (error) => {
          this.showErrorMessage(error, this.errorlabels.regCenterNotavailabe);
        });
    this.subscriptions.push(subs);
  }

  getLocationNames(locationCode) {
    return new Promise((resolve) => {
      this.dataService
        .getLocationInfoForLocCode(locationCode, this.langCode)
        .subscribe((response) => {
          if (response[appConstants.RESPONSE]) {
            let locName = response[appConstants.RESPONSE]["name"];
            this.locationNames.push(locName);
            resolve(true);
          }
        },
          (error) => {
            this.showErrorMessage(error, this.errorlabels.regCenterNotavailabe);
          });
    });
  }

  setSearchClick(flag: boolean) {
    //this.searchClick = flag;
    this.nearbyClicked = false;
  }

  onSubmit() {
    this.searchTextFlag = true;
    if (this.searchText.length !== 0 || this.searchText !== null) {
      this.displayMessage = `Searching results for ${this.searchText} ....`;
    } else {
      this.displayMessage = "";
    }
  }
  setStep(index: number) {
    this.step = index;
  }

  nextStep() {
    this.step++;
    this.showDescription = true;
  }

  prevStep() {
    this.step--;
  }
  resetPagination() {
    this.totalItems = 0;
    this.pageSize = this.defaultPageSize;
    this.pageIndex = 0;
    this.getRecommendedCenters();
  }
  
  searchInput(){
    if(this.searchText.length > 2 && this.searchText.match(/^[A-Za-z0-9 _]*[A-Za-z0-9][A-Za-z0-9 _]*$/)){
      this.isBlankSpace = false;
    }else{
      this.isBlankSpace = true;
    }
    if(!this.searchText.match(/^[A-Za-z0-9 _]*[A-Za-z0-9][A-Za-z0-9 _]*$/)){
      this.showWarningMsg = true;
    }else{
      this.showWarningMsg = false;
    }
  }

  showResults(pageEvent) {
    this.auditService.audit('RP-040', 'Locate registration center', 'RP-Locate registration center', 'Locate registration center', 'User clicks on "search" button on locate registration center page');
    this.REGISTRATION_CENTRES = [];
    if (this.locationType !== null && this.searchText) {
      this.showMap = false;
      if (pageEvent) {
        this.pageSize = pageEvent.pageSize;
        this.pageIndex = pageEvent.pageIndex;
      }
      //console.log(this.locationType);
      const subs = this.dataService
        .getRegistrationCentersByNamePageWise(
          this.locationType.hierarchyLevel,
          this.searchText,
          this.pageIndex,
          this.pageSize
        )
        .subscribe(
          (response) => {
            console.log(response)
            if (response[appConstants.RESPONSE]) {
              this.totalItems = response[appConstants.RESPONSE].totalItems;
              this.displayResults(response[appConstants.RESPONSE]);
              this.showMessage = false;
            } else {
              this.totalItems = 0;
              this.showMessage = true;
              this.showMesssageText = this.popupMessages.centerSelection.noRegCenters;
              this.selectedCentre = null;
            }
          },
          (error) => {
            this.showMessage = true;
            this.totalItems = 0;
            this.selectedCentre = null;
            //this.showErrorMessage(error);
          });
      this.subscriptions.push(subs);
    } else {
      this.showMessage = true;
      this.totalItems = 0;
      this.selectedCentre = null;
    }
  }

  onChangeLocationType() {
    //console.log('onChangeLocationType');
    this.showMessage = false;
    this.totalItems = 0;
    this.searchText = "";
    //this.REGISTRATION_CENTRES = [];
    this.selectedCentre = null;
  }

  plotOnMap() {
    this.showMap = true;
    this.service.changeCoordinates([
      Number(this.selectedCentre.longitude),
      Number(this.selectedCentre.latitude),
    ]);
  }

  selectedRow(row) {
    this.selectedCentre = row;
    this.enableNextButton = true;

    if (Object.keys(this.selectedCentre).length !== 0) {
      this.plotOnMap();
    }
  }

  getLocation() {
    this.REGISTRATION_CENTRES = [];
    this.nearbyClicked = true;
    if (navigator.geolocation) {
      this.showMap = false;
      navigator.geolocation.getCurrentPosition((position) => {
        const subs = this.dataService
          .getNearbyRegistrationCenters(position.coords)
          .subscribe(
            (response) => {
              if (!response["errors"]) {
                this.displayResults(response[appConstants.RESPONSE]);
                this.showMessage = false;
              } else {
                if (response['errors'][0].errorCode === "RES-SER-418") {
                  this.showMesssageText = this.popupMessages.centerSelection.noRegCentersNearby;
                }
                this.searchClick = false;
                this.showMessage = true;
                this.selectedCentre = null;
              }
            },
            (error) => {
              this.showMessage = true;
              this.selectedCentre = null;
              //this.showErrorMessage(error);
            });
        this.subscriptions.push(subs);
      });
    } else {
    }
  }

  changeTimeFormat(time: string): string | Number {
    let inputTime = time.split(":");
    let formattedTime: any;
    if (Number(inputTime[0]) < 12 && Number(inputTime[0]) > 0) {
      formattedTime = inputTime[0];
      formattedTime += ":" + inputTime[1] + " am";
    } else if (Number(inputTime[0]) === 0) {
      formattedTime = Number(inputTime[0]) + 12;
      formattedTime += ":" + inputTime[1] + " am";
    } else if (Number(inputTime[0]) === 12) {
      formattedTime = inputTime[0];
      formattedTime += ":" + inputTime[1] + " pm";
    } else {
      formattedTime = Number(inputTime[0]) - 12;
      formattedTime += ":" + inputTime[1] + " pm";
    }
    return formattedTime;
  }

  showTime(startTime: string, endTime: string): string | Number {
    let formattedStartTime = this.changeTimeFormat(startTime);
    let formattedEndTime = this.changeTimeFormat(endTime);
    let formattedTime = formattedStartTime + ' - ' + formattedEndTime;
    if (this.textDir == "rtl") {
      formattedTime = formattedEndTime + ' - ' + formattedStartTime;
    }
    return formattedTime;
  }

  dispatchCenterCoordinatesList() {
    const coords = [];
    this.REGISTRATION_CENTRES.forEach((centre) => {
      const data = {
        id: centre.id,
        latitude: Number(centre.latitude),
        longitude: Number(centre.longitude),
      };
      coords.push(data);
    });
    this.service.listOfCenters(coords);
  }

  routeNext() {
    this.canDeactivateFlag = false;
    this.router.navigate(["../pick-time"], {
      relativeTo: this.route,
      queryParams: { regCenter: this.selectedCentre.id },
    });
  }

  routeDashboard() {
    this.canDeactivateFlag = false;
    this.router.navigate([`${this.langCode}/dashboard`]);
  }

  /* routeBack() {
     if (
       this.router.url.includes("multiappointment") ||
       localStorage.getItem("modifyMultipleAppointment") === "true"
     ) {
       this.routeDashboard();
     } else {
       let url = "";
       url = Utils.getURL(this.router.url, "summary", 3);
       this.canDeactivateFlag = false;
       this.router.navigateByUrl(url + `/${this.preRegId[0]}/preview`);
     }
   }*/

  async displayResults(response: any) {
    if (response["registrationCenters"]) {
      this.REGISTRATION_CENTRES = response["registrationCenters"];
    } else if (response["data"]) {
      this.REGISTRATION_CENTRES = response["data"];
    }
    await this.getWorkingDays();
    this.showTable = true;
    this.isWorkingDaysAvailable = true;
    if (this.REGISTRATION_CENTRES) {
      this.selectedRow(this.REGISTRATION_CENTRES[0]);
      this.dispatchCenterCoordinatesList();
    }
  }

  getWorkingDays() {
    return new Promise((resolve) => {
      this.REGISTRATION_CENTRES.forEach((center) => {
        this.dataService
          .getWorkingDays(center.id, this.langCode)
          .subscribe((response) => {
            center.workingDays = "";
            if (response[appConstants.RESPONSE] && response[appConstants.RESPONSE]["workingdays"]) {
              response[appConstants.RESPONSE]["workingdays"].forEach((day) => {
                if (center.workingDays != "") {
                  center.workingDays += ", ";
                }
                center.workingDays = center.workingDays + day.name;
              });
            }
            this.isWorkingDaysAvailable = true;
            resolve(true);
          },
            (error) => {
              this.showErrorMessage(error);
            });
      });
    });
  }

  /**
   * @description This is a dialoug box whenever an error comes from the server, it will appear.
   *
   * @private
   * @memberof CenterSelectionComponent
   */
  private showErrorMessage(error: any, customErrMsg?: string) {
    const titleOnError = this.errorlabels.errorLabel;
    let message = "";
    if (customErrMsg) {
      message = customErrMsg;
    } else {
      //message = Utils.createErrorMessage(error, this.errorlabels, this.apiErrorCodes, this.configService);  
    }
    const body = {
      case: "ERROR",
      title: titleOnError,
      message: message,
      yesButtonText: this.errorlabels.button_ok,
    };
    /* const dialogRef = this.openDialog(body, "400px");
     dialogRef.afterClosed().subscribe(() => {
       if (body.message === this.errorlabels.regCenterNotavailabe) {
         this.canDeactivateFlag = false;
         if (
           this.router.url.includes("multiappointment") ||
           localStorage.getItem("modifyMultipleAppointment") === "true"
         ) {
           this.routeDashboard();
         } else {
           localStorage.setItem(appConstants.MODIFY_USER, "true");
           this.router.navigate([
             `${this.langCode}/pre-registration/demographic/${this.preRegId[0]}`,
           ]);
         }
       }
     });*/
  }

  openDialog() {
    const dialogRef = this.dialog.open(DialogComponent, {
      width: '850px',
      data: {
        case: 'CONFIRMATION',
        title: "",
        message: "message",
      },
    });
    return dialogRef;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  downloadCentersPdf() {
    this.auditService.audit('RP-041', 'Locate registration center', 'RP-Locate registration center', 'Locate registration center', 'User clicks on "download" button on locate registration center page');
    if (this.locationType && this.searchText) {
      this.dataService.registrationCentersList(this.langCode, this.locationType.hierarchyLevel, this.searchText)
        .subscribe(response => {
          if (response.headers.get('Content-Type') === 'application/pdf') {
            var fileName = "";
            const contentDisposition = response.headers.get('Content-Disposition');
            if (contentDisposition) {
              const fileNameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
              const matches = fileNameRegex.exec(contentDisposition);
              if (matches != null && matches[1]) {
                fileName = matches[1].replace(/['"]/g, '');
              }
            }
            saveAs(response.body, fileName);
          } else {
            console.log("")
          }
        }, error => {
          console.log(error)
        })
    } else {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          this.dataService.nearByRegistrationCentersList(this.langCode, position.coords)
          .subscribe(response =>{
            if (response.headers.get('Content-Type') === 'application/pdf') {
              var fileName = "";
            const contentDisposition = response.headers.get('Content-Disposition');
            if (contentDisposition) {
              const fileNameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
              const matches = fileNameRegex.exec(contentDisposition);
              if (matches != null && matches[1]) {
                fileName = matches[1].replace(/['"]/g, '');
              }
            }
            saveAs(response.body, fileName);
          } else {
            console.log("");
            }
          }, error =>{
              console.log(error);
          })
        })
      }
    }
  }

  // showErrorPopup(message: string) {
  //   this.dialog
  //     .open(DialogComponent, {
  //       width: '550px',
  //       data: {
  //         case: 'MESSAGE',
  //         title: this.popupMessages.genericmessage.errorLabel,
  //         message: message,
  //         btnTxt: this.popupMessages.genericmessage.successButton
  //       },
  //       disableClose: true
  //     });
  // }

  onItemSelected(item: any) {
    if (item.index === 1) {
      this.router.navigate(["document"]);
    } else if (item === "home") {
      this.router.navigate(["dashboard"]);
    } else {
      this.router.navigate(["regcenter"]);
    }
  }
}
