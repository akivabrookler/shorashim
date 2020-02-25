interface JQueryStatic {
    print(id: string, options?: any): void;
}

//-----------------------------------------------------------------------------
// Data model
//-----------------------------------------------------------------------------
type Gender = 'M' | 'F';


enum RelationshipType {
    // DevNote: keep in sync with RelationshipToMeType enum in RelationshipType.cs
    Father = 1,
    Mother = 2,
    StepFather = 3,
    StepMother = 4,
    AdoptedFather = 5,
    AdoptedMother = 6,

    // DevNote: Negative values used to indicate reverse direction of relationship
    //     These should not be stored in the database.
    Child_OfFather = -Father,
    Child_OfMother = -Mother,
    StepChild_OfFather = -StepFather,
    StepChild_OfMother = -StepMother,
    AdoptedChild_OfFather = -AdoptedFather,
    AdoptedChild_OfMother = -AdoptedMother
}


interface IPerson {
    Id: number,
    DisplayName: string,
    Gender: string,
    DateOfBirth: string,
    DateOfDeath: string
}


interface IPersonFullDetails extends IPerson {
    AdditionalNotes: string,
    Veracity: string
}


interface IRelationshipToMe {
    RelatedPersonId: number;
    Type: RelationshipType;
    State: number;
}


interface IPersonAllDetails {
    Details: IPersonFullDetails,
    Relationships: IRelationshipToMe[]
}


interface IRelationship {
    PersonId: number;
    RelatedPersonId: number;
    Type: RelationshipType;
    State: number;
}



//-----------------------------------------------------------------------------
// API responses
//-----------------------------------------------------------------------------
interface IApiResponse {
    Success: boolean,
    ErrorMessage: string
}


interface IAddApiResponse extends IApiResponse {
    NewId: string,
}



//-----------------------------------------------------------------------------
// Genealogy interfaces
//-----------------------------------------------------------------------------
interface IGenealogyWorkspace {
    getId(
    ): string;

    initializeToolbar(
        toolbar: dhtmlXToolbarObject
    ): void;

    saveIfNeeded(
    ): JQueryPromise<boolean>;

    setPerson(
        person: IPerson
    ): void;
}



//-----------------------------------------------------------------------------
// CLASS: Genealogy
//-----------------------------------------------------------------------------
class Genealogy {
    // ************************************************************************
    // constants
    private static readonly MODES_ID: string = "modesId";
    private static readonly PRINT_ID: string = "printId";

    public static readonly EDITOR_ID: string = "editorId";
    public static readonly ANCESTOR_TREE_CHART_ID: string = "ancestorTreeChartId";
    public static readonly DESCENDANT_TREE_CHART_ID: string = "descendantTreeChartId";
    public static readonly COMBINED_TREE_CHART_ID: string = "combinedTreeChartId";
    public static readonly ANCESTOR_FAN_CHART_ID: string = "ancestorFanChartId";
    public static readonly DESCENDANT_FAN_CHART_ID: string = "descendantFanChartId";

    // ************************************************************************
    // members
    private _layout: dhtmlXLayoutObject;
    private _peopleList: PeopleList; 
    private _workspace: IGenealogyWorkspace;
    private _footerCell: dhtmlXCell;
    private _toolbar: GenealogyToolbar;
    private _person: IPerson;

    // ************************************************************************
    // construction
    public constructor(
        parentId: string
    ) {
        this._layout = new dhtmlXLayoutObject({ parent: parentId, pattern: "3U" });
        this._toolbar = new GenealogyToolbar(this, this._layout);
        this._peopleList = new PeopleList(this, this.peopleContainer());
        this.createFooterCell();

        // start off showing editor
        this.showEditor();
    }

    // ************************************************************************
    // data accessors
    public getPeople(
    ): IPerson[] {
        return this._peopleList.getPeople();
    }

    public getPerson(
        personId: number
    ): IPerson {
        return this._peopleList.getPerson(personId);
    }

    // ************************************************************************
    // operators
    public setPerson(
        person: IPerson
    ): void {
        this._person = person;

        if (this._workspace) {
            this._workspace.setPerson(person);
        }
        this._peopleList.setPerson(person);
    }

    public updatePersonDetails(
        person: IPerson
    ): void {
        this._peopleList.updatePersonDetails(person);
    }

    // ************************************************************************
    // operators -- modes
    public showEditor(
    ): void {
        var container = this.workspaceContainer();
        container.detachObject(true);

        this._workspace = new PersonEditor(this, container);
        this.initializeWorkspace();
    }

    public saveIfNeeded(
    ): JQueryPromise<boolean> {
        return this._workspace.saveIfNeeded();
    }

    public showTreeChart(
        chartType: GeneralGenealogyChartType
    ): void {
        var container = this.workspaceContainer();
        container.detachObject(true);

        this._workspace = new GenealogyTreeChart(this, container, chartType);
        this.initializeWorkspace();
    }
    public showFanChart(
        chartType: GeneralGenealogyChartType
    ): void {
        var container = this.workspaceContainer();
        container.detachObject(true);

        this._workspace = new GenealogyFanChart(this, container, chartType);
        this.initializeWorkspace();
    }
    
    // ************************************************************************
    // event handlers
    private __skipOnToolbarButtonClick: boolean = true;
    public onToolbarButtonClick(
        id: string
    ): void {
        if (id === Genealogy.PRINT_ID) {

            if (this._workspace.getId() === Genealogy.DESCENDANT_FAN_CHART_ID
                || this._workspace.getId() === Genealogy.ANCESTOR_FAN_CHART_ID) {
                $.print("#chartContainer", {title: "Shoroshim App" });
                
            } else if (this._workspace.getId() === Genealogy.COMBINED_TREE_CHART_ID) {
                $.print("#CombinedAncestorDescendantChartId", {title: "Shoroshim App" });
            } else if (this._workspace.getId() === Genealogy.ANCESTOR_TREE_CHART_ID) {
                $.print("#AncestorChartId", {title: "Shoroshim App" });
            } else if (this._workspace.getId() === Genealogy.DESCENDANT_TREE_CHART_ID) {
                $.print("#DescendantChartId", {title: "Shoroshim App" });
            } else if (this._workspace.getId() === Genealogy.EDITOR_ID) {
                $.print("#PersonEditor", {title: "Shoroshim App" });
            }
        } else {
            this.__skipOnToolbarButtonClick = !this.__skipOnToolbarButtonClick;
            if (this.__skipOnToolbarButtonClick) {
                return;
            }

            switch (id) {
                case Genealogy.EDITOR_ID:
                case Genealogy.ANCESTOR_TREE_CHART_ID:
                case Genealogy.DESCENDANT_TREE_CHART_ID:
                case Genealogy.COMBINED_TREE_CHART_ID:
                case Genealogy.ANCESTOR_FAN_CHART_ID:
                case Genealogy.DESCENDANT_FAN_CHART_ID:
                    this.changeWorkspace(id);
                    break;
            }
        }
    }

    // ************************************************************************
    // static methods
    public static spaceCamelCase(
        string: string
    ): string {
        var result: string;
        result = string
            .charAt(0);
        for (var i = 1; i < string.length; i++) {
            var ch = string.charAt(i);
            if (ch == ch.toUpperCase()) {
                result += ' ' + ch.toLowerCase();
            } else {
                result += ch;
            }
        }
        return result;
    }

    public static getDatesString(
        dateOfBirth: string,
        dateOfDeath: string
    ): string {
        return Genealogy.getYear(dateOfBirth, '?') + '&nbsp;&mdash;&nbsp;' + Genealogy.getYear(dateOfDeath, 'Present');
    }

    public static getRelationshipText(
        type: RelationshipType
    ): string {
        switch (type) {
            case RelationshipType.Father:
            case RelationshipType.Mother:
            case RelationshipType.StepFather:
            case RelationshipType.StepMother:
            case RelationshipType.AdoptedFather:
            case RelationshipType.AdoptedMother:
                var s: string = RelationshipType[type];
                var result: string;
                result = s.charAt(0);
                for (var i = 1; i < s.length; i++) {
                    var ch = s.charAt(i);
                    if (ch == ch.toUpperCase()) {
                        result += ' ' + ch.toLowerCase();
                    } else {
                        result += ch;
                    }
                }
                return result;
            case RelationshipType.Child_OfFather:
            case RelationshipType.Child_OfMother:
                return "Child";
            case RelationshipType.StepChild_OfFather:
            case RelationshipType.StepChild_OfMother:
                return "Step Child";
            case RelationshipType.AdoptedChild_OfFather:
            case RelationshipType.AdoptedChild_OfMother:
                return "Adopted Child";
        }
    }

    public static makePersonData(
        id: number,
        displayName: string,
        gender: Gender,
        dateOfBirth: string,
        dateOfDeath: string
    ): IPerson {
        return {
            Id: id,
            DisplayName: displayName,
            Gender: gender,
            DateOfBirth: dateOfBirth,
            DateOfDeath: dateOfDeath
        };
    }

    // ************************************************************************
    // implementation
    private changeWorkspace(
        id: string
    ): void {
        var myThis = this;
        this._workspace.saveIfNeeded().then(function (canChange) {
            if (canChange) {
                switch (id) {
                    case Genealogy.EDITOR_ID:
                        myThis.showEditor();
                        break;
                    case Genealogy.ANCESTOR_TREE_CHART_ID:
                        myThis.showTreeChart(GeneralGenealogyChartType.Ancestor);
                        break;
                    case Genealogy.DESCENDANT_TREE_CHART_ID:
                        myThis.showTreeChart(GeneralGenealogyChartType.Descendant);
                        break;
                    case Genealogy.COMBINED_TREE_CHART_ID:
                        myThis.showTreeChart(GeneralGenealogyChartType.AncestorDescendant);
                        break;
                    case Genealogy.ANCESTOR_FAN_CHART_ID:
                        myThis.showFanChart(GeneralGenealogyChartType.Ancestor);
                        break;
                    case Genealogy.DESCENDANT_FAN_CHART_ID:
                        myThis.showFanChart(GeneralGenealogyChartType.Descendant);
                        break;
                }
            }
        });
    }

    private peopleContainer(
    ): dhtmlXCell {
        return this._layout.cells("a");
    }

    private workspaceContainer(
    ): dhtmlXCell {
        return this._layout.cells("b");
    }

    private footerContainer(
    ): dhtmlXCell {
        return this._layout.cells("c");
    }

    private createFooterCell(
    ): void {
        var footerCell = this.footerContainer();
        footerCell.hideHeader();
        footerCell.setHeight(30);
        footerCell.attachHTMLString("<footer><p>The Shoroshim App &mdash; &copy; " + (new Date()).getFullYear() + " &mdash; The Brookler Family &mdash; All rights reserved.</p></footer>");
    }

    private initializeWorkspace(
    ): void {
        var toolbar = this._toolbar.toolbar();
        toolbar.clearAll();
        toolbar.addButtonSelect(Genealogy.MODES_ID, 0, 'Modes', [
            [Genealogy.EDITOR_ID, 'obj', 'Editor', ''],
            ['SpacerId', 'sep', '', ''],
            [Genealogy.ANCESTOR_TREE_CHART_ID, 'obj', 'Ancestor Tree Chart', ''],
            [Genealogy.DESCENDANT_TREE_CHART_ID, 'obj', 'Descendant Tree Chart', ''],
            [Genealogy.COMBINED_TREE_CHART_ID, 'obj', 'Combined Ancestor/Descendant Tree Chart', ''],
            [Genealogy.ANCESTOR_FAN_CHART_ID, 'obj', 'Ancestor Fan Chart', ''],
            [Genealogy.DESCENDANT_FAN_CHART_ID, 'obj', 'Descendant Fan Chart', ''],
        ]);
        toolbar.addButton(Genealogy.PRINT_ID, 1, "Print");

        toolbar.attachEvent('onClick', (id) => this.onToolbarButtonClick(id));
        this._workspace.initializeToolbar(toolbar);

        if (this._person) {
            this._workspace.setPerson(this._person);
        }
    }

    private static getYear(
        dateString: string,
        defaultValue: string
    ): string {
        if (dateString == '?') {
            return '?'
        }
        if (dateString) {
            var dateTime = new Date(dateString);
            if (dateTime.toString() != "Invalid Date") {
                return dateTime.getFullYear().toString();
            }
        }
        return defaultValue;
    }
}
