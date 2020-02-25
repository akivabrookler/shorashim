//-----------------------------------------------------------------------------
// CLASS: GenealogyToolbar
//-----------------------------------------------------------------------------
var GenealogyToolbar = (function () {
    // ************************************************************************
    // construction
    function GenealogyToolbar(genealogy, container) {
        this._genealogy = genealogy;
        this._toolbar = container.attachToolbar();
    }
    // ************************************************************************
    // data accessors
    GenealogyToolbar.prototype.toolbar = function () {
        return this._toolbar;
    };
    return GenealogyToolbar;
}());
