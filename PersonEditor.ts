declare var __AddAntiForgeryToken;



type PersonEditorFormField = 'DisplayName' | 'DateOfBirth' | 'DateOfDeath' | 'Gender' | 'AdditionalNotes'|'Veracity';



//-----------------------------------------------------------------------------
// CLASS: PersonEditor
//-----------------------------------------------------------------------------
class PersonEditor {
    // ************************************************************************
    // constants
    private static readonly SAVE_BUTTON_ID: string = "SaveButtonId";
    private static readonly ADD_RELATIONSHIP_BUTTON_ID: string = "AddRelationshipButtonId";
    private static readonly REMOVE_RELATIONSHIP_BUTTON_ID: string = "ReemoveRelationshipButtonId";
    private static readonly COLUMN_1_LABEL_LEFT:number = 10;
    private static readonly COLUMN_1_CONTROL_LEFT: number = 110;
    private static readonly COLUMN_2_LEFT: number = 350;
    private static readonly GENDER_LABEL_WIDTH: number = 60;

    // ************************************************************************
    // members
    private _genealogy: Genealogy;
    private _layout:dhtmlXLayoutObject;
    private _detailsGrid: dhtmlXGridObject;
    private _person: IPersonAllDetails;
    private _relationshipsGrid: dhtmlXGridObject;
    private _relationshipsToolbar: dhtmlXToolbarObject;
    private _editor: dhtmlXEditor;

    // ************************************************************************
    // construction
    public constructor(
        genealogy: Genealogy,
        container: dhtmlXCell,
    ) {
        this._genealogy = genealogy;
        container.hideHeader();
        var myThis = this;
        this._layout = container.attachLayout("2E");
        container.cell.id = "PersonEditor";

        this.detailsContainer().setText("Details");
        this.detailsContainer().fixSize(false, true);
        this.detailsContainer().setHeight(280);
        this._detailsGrid = this.detailsContainer().attachGrid({
            columns: [
                { label:"Category", width: 200, type: "ro", sort: "na", align: "left" },
                { label:"Value", width: 200, type: "ed", sort: "na", align: "left" },
                { label: "Vercaity", width: 200, type:"ro", sort:"na", align: "left" },
                { label: "Change Veracity", width: 200, type: "img", sort:"na", align: "left" },

            ]
        })
      
        this.relationshipsContainer().setText("Relationships");
        this._relationshipsToolbar = this.relationshipsContainer().attachToolbar({
            items: [
                { id: PersonEditor.ADD_RELATIONSHIP_BUTTON_ID, type: "button", text: "Add" },
                { id: PersonEditor.REMOVE_RELATIONSHIP_BUTTON_ID, type: "button", text: "Remove" }]
        });
        this._relationshipsToolbar.attachEvent("onClick", (id) => this.onButtonClicked(id));
        this._relationshipsGrid = this.relationshipsContainer().attachGrid({
            columns: [
                { label: "Person", width: 200, type: "ro", sort: "int", align: "left" },
                { label: "Relationship", width: 200, type: "ro", sort: "str", align: "left"
                }],
            multiselect: true
        });
    }

    // ************************************************************************
    // IGenealogyWorkspace overrides
    public getId(
    ): string {
        return Genealogy.EDITOR_ID;
    }

    public initializeToolbar(
        toolbar: dhtmlXToolbarObject
    ): void {
        toolbar.addSeparator('', 1);
        toolbar.addButton(PersonEditor.SAVE_BUTTON_ID, 2, 'Save');

        toolbar.attachEvent('onClick', (id) => this.onButtonClicked(id));
    }

    public saveIfNeeded(
    ): JQueryPromise<boolean> {
        var myThis = this;
        var canChange = $.Deferred<boolean>(); 

        if (this.needsSaving()) {
            var validationErrors = this.getValidationErrors();
            if (!validationErrors) {
                MessageDialog.doModal(
                    "Save Person Details",
                    "Do you want to save the details for <B>" + this.getFormFieldValue("DisplayName") + "</B>?",
                    MessageDialog.ModalType.YesNoCancel
                ).then(function (result) {
                    switch (result) {
                        case MessageDialog.ModalResult.Yes:
                            myThis.save()
                                .done((response: IApiResponse) => {
                                    canChange.resolve(response.Success);
                                })
                                .fail(() => {
                                    canChange.resolve(false);
                                });
                            break;
                        case MessageDialog.ModalResult.No:
                            canChange.resolve(true);
                            break;
                        case MessageDialog.ModalResult.Cancel:
                            canChange.resolve(false);
                            break;
                    }
                });
            } else {
                MessageDialog.doModal(
                    "Save Person Details",
                    "<P>Cannot save due to the following error(s):</P>" +
                    validationErrors +
                    "<P>Discard and continue?</P>",
                    MessageDialog.ModalType.YesCancel
                ).then(function (result) {
                    switch (result) {
                        case MessageDialog.ModalResult.Yes:
                            canChange.resolve(true);
                            break;
                        case MessageDialog.ModalResult.Cancel:
                            canChange.resolve(false);
                            break;
                    }
                });
            }
        } else {
            canChange.resolve(true);
        }

        return canChange.promise();
    }

    public setPerson(
        person: IPerson
    ): void {
        this._relationshipsGrid.clearAll(false);
        this._detailsGrid.clearAll(false);

        var url = "/Genealogy/GetPersonAllDetails?personId=" + person.Id;
        $.getJSON(url, null, (personAllDetails: IPersonAllDetails) => {
            this._person = personAllDetails;

            //this might need to be removed later
            if (this._person.Details.Veracity === undefined) {
                this._person.Details.Veracity = 'None';
            }

            var gender = (personAllDetails.Details.Gender === "M") ? "Male" : "Female";
            var myThis = this;

            this._detailsGrid.addRow("DisplayName", ["Display Name", this._person.Details.DisplayName], 0);
            this._detailsGrid.addRow("Gender", ["Gender", gender], 1);
            this._detailsGrid.addRow("DateOfBirth", ["Date of Birth", this._person.Details.DateOfBirth, this._person.Details.Veracity, '<img src="@Url.Content("~/Images/images.png")" />'], 2);
            this._detailsGrid.addRow("DateOfDeath", ["Date of Death", this._person.Details.DateOfDeath, this._person.Details.Veracity, '<img src="~/Images/images.png" />'], 3);
            this._detailsGrid.addRow("AdditionalNotes", ["Additional Notes", this._person.Details.AdditionalNotes, this._person.Details.Veracity, "<img src='Images\images.png'>"], 4);

            this._detailsGrid.attachEvent("onRowSelect", function (id, ind) {
                var selected = myThis._detailsGrid.getSelectedRowId();
                var column = myThis._detailsGrid.getSelectedCellIndex();
                var rowIndex = myThis._detailsGrid.getRowIndex(selected);
                if (column === 1) {
                    switch (selected) {
                        case "DisplayName":
                        case "DateOfBirth":
                        case "DateOfDeath":
                        case "AdditionalNotes":
                            myThis._detailsGrid.selectCell(rowIndex, 1, true, true, true);
                            break;
                    }
                } else if (column === 3) {
                    switch (selected) {
                        case "DateOfBirth":
                        case "DateOfDeath":
                        case "AdditionalNotes":
                            var form = new AddFileDialog(myThis._layout.dhxWins, myThis._person.Details, selected, myThis._detailsGrid);
                            break;
                    }
                }

            });

            for (var i = 0; i < personAllDetails.Relationships.length; i++) {
                var relationship = personAllDetails.Relationships[i];
                var relationshipTypeText = Genealogy.getRelationshipText(relationship.Type);
                this._relationshipsGrid.addRow(
                    relationship.RelatedPersonId,
                    [this._genealogy.getPerson(relationship.RelatedPersonId).DisplayName, relationshipTypeText],
                    0);
                this._relationshipsGrid.setUserData(relationship.RelatedPersonId, "Type", relationship.Type);
            }            
        });
    }

    // ************************************************************************
    // event handlers
    private addRelationship(
        personId: number,
        relationshipType: RelationshipType
    ): void {
        var relationshipTypeText = Genealogy.getRelationshipText(relationshipType);
        var person = this._genealogy.getPerson(personId);
        this._relationshipsGrid.addRow(personId, [person.DisplayName, relationshipTypeText], 0);
        this._relationshipsGrid.setUserData(personId, "Type", relationshipType);
    }

    private onButtonClicked(
        id: string
    ): void {
        var myThis: PersonEditor = this;
        if (id == PersonEditor.SAVE_BUTTON_ID) {
            myThis.save()
                .done((response: IApiResponse) => {
                    if (!response.Success) {
                        alert("Could not save person: " + response.ErrorMessage);
                    }
                })
                .fail(() => {
                    alert("Could not save person");
                });
        } else if (id == PersonEditor.ADD_RELATIONSHIP_BUTTON_ID) {
            var form = new AddEditRelationshipDialog(
                myThis._genealogy,
                myThis._layout.dhxWins,
                myThis._person.Details,
                myThis.addRelationship.bind(myThis)
                );
        } else if (id === PersonEditor.REMOVE_RELATIONSHIP_BUTTON_ID) {
            this._relationshipsGrid.deleteSelectedRows();
        }
    }

    // ************************************************************************
    // implementation
    private detailsContainer(
    ): dhtmlXCell {
        return this._layout.cells("a");
    }
    private relationshipsContainer(
    ): dhtmlXCell {
        return this._layout.cells("b");
    }

    private getFormFieldValue(formField: PersonEditorFormField) {
        return this._detailsGrid.cellById(formField, 1).getValue();
    }
    
    private getValidationErrors(
    ): string {
        var validationErrors: string = "";
        if (this.getFormFieldValue("DisplayName") == "") {
            validationErrors += "Display name cannot be blank<BR>";
        }
        return validationErrors;
    }

    private needsSaving(
    ): boolean {
        return (this._person &&
            (this.getFormFieldValue("DisplayName") != this._person.Details.DisplayName) &&
            (this.getFormFieldValue("DateOfBirth") != this._person.Details.DateOfBirth) &&
            (this.getFormFieldValue("DateOfDeath") != this._person.Details.DateOfDeath) &&
            (this.getFormFieldValue("AdditionalNotes") != this._person.Details.AdditionalNotes));
    }

    private isDisplayNameChanged():boolean {
        var displayName = this.getFormFieldValue("DisplayName");
        return (displayName != this._person.Details.DisplayName);
    }

    private save(
    ): JQueryPromise<IApiResponse> {
        var saveResponse = $.Deferred<IApiResponse>(); 

        var myThis = this;
        var url = "/Genealogy/SavePerson";
        var person = this.getPersonData();
        $.post(url, __AddAntiForgeryToken(person))
            .done((response: IApiResponse) => {
                if (response.Success) {
                    myThis._genealogy.updatePersonDetails(person.Details);
                }
                saveResponse.resolve(response);
            })
            .fail(() => {
                saveResponse.reject();
            });

        return saveResponse;
    }

    private getPersonData(
    ): IPersonAllDetails {
        return {
            Details: {
                Id: this._person.Details.Id,
                DisplayName: this.getFormFieldValue("DisplayName"),
                Gender: this._person.Details.Gender,
                DateOfBirth: this.getFormFieldValue("DateOfBirth"),
                DateOfDeath: this.getFormFieldValue("DateOfDeath"),
                AdditionalNotes: this.getFormFieldValue("AdditionalNotes"),
                Veracity: this.getFormFieldValue("Veracity")
            },
            Relationships: this.getRelationships()
        };
    }

    private getRelationships(
    ): IRelationshipToMe[] {
        var relationships: IRelationshipToMe[] = [];
        for (var i = 0; i < this._relationshipsGrid.getRowsNum(); i++) {
            var personId = this._relationshipsGrid.getRowId(i);
            var relationshipType = this._relationshipsGrid.getUserData(personId, "Type");
            relationships.push({
                RelatedPersonId: personId,
                Type: relationshipType,
                State: 0
            });
        }
        return relationships;
    }
}
