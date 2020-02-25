declare module d3 {
    module scale {
        function category20(): void;
    }
}

declare module psd3 {
    class Pie {
        constructor(config: any);
    }
}



//-----------------------------------------------------------------------------
// CLASS: GenealogyFanChart
//-----------------------------------------------------------------------------
class GenealogyFanChart extends GeneralGenealogyChart {
    // ************************************************************************
    // construction
    public constructor(
        genealogy: Genealogy,
        container: dhtmlXCell,
        chartType: GeneralGenealogyChartType
    ) {
        super(genealogy, container, chartType);
        this._chartType = chartType;

        container.attachHTMLString('<div id="ChartContainer"></div>');
    }

    // ************************************************************************
    // GeneralGenealogyChart overrides
    public getId(
    ): string {
        var id = null;
        if (this._chartType === GeneralGenealogyChartType.Ancestor) {
            id = Genealogy.ANCESTOR_FAN_CHART_ID;
        } else if (this._chartType === GeneralGenealogyChartType.Descendant) {
            id = Genealogy.DESCENDANT_FAN_CHART_ID;
        }
        return id;
    }

    protected showChart(
    ): void {
        var myThis = this;
        this.removeCharts();

        var heading = null;
        if (this._chartType === GeneralGenealogyChartType.Ancestor) {
            heading = "Ancestors"
        } else if (this._chartType === GeneralGenealogyChartType.Descendant) {
            heading = "Descendant"
        }

        var data = null;
        data = this.getData(this._person.Id);
        var fanChartData = [data];
        var config = {
            containerId: "ChartContainer",
            width: 500,
            height: 500,
            data: fanChartData,
            heading: {
                text: heading +" Fan Chart",
                pos: "top"
            },
            label: function (d) {
                return d.data.displayName
            },
            value: "value",
            inner: "drilldown",
            tooltip: function (d) {
                return "<div class = 'psd3Hidden'></div>";
            },
            transition: "linear",
            transitionDuration: 500,
            donutRadius: 50,
            gradient: true,
            colors: d3.scale.category20(),
            labelColor: "white",
            stroke: "#eee",
            strokeWidth: 3,
            drilldownTransition: "linear",
            drilldownTransitionDuration: 0,
            highlightColor: "#c00",
            onClick: function (d) {
                myThis.makeClickedOnChart(d);
            }
        };
        var fanChart = new psd3.Pie(config);
    }

    // ************************************************************************
    // implementation
    private removeCharts(
    ): void {
        $("#ChartContainer").empty();
    }

    private getData(
        personId: number
    ): any {
        var data = {
            value: 1,
            id: personId,
            displayName: this._genealogy.getPerson(personId).DisplayName,
            drilldown: []
        };
        if (this._chartType === GeneralGenealogyChartType.Ancestor) {
            for (var i = 0; i < this._ancestors.length; i++) {
                if (this._ancestors[i].RelatedPersonId == personId) {
                    var childData = this.getData(this._ancestors[i].PersonId);
                    data.drilldown.push(childData);
                }
            }
        } else if (this._chartType === GeneralGenealogyChartType.Descendant) {
            for (var i = 0; i < this._descendants.length; i++) {
                if (this._descendants[i].PersonId == personId) {
                    var childData = this.getData(this._descendants[i].RelatedPersonId);
                    data.drilldown.push(childData);
                }
            }
        }

        return data;
    }

    private makeClickedOnChart(
        d: any
    ): void {
        var personId = parseInt(d.data.id);
        var selectedPerson = this._genealogy.getPerson(personId);
        this.setPerson(selectedPerson);
        
    }
}