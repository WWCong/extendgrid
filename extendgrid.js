
String.prototype.format= function(){
    var args = arguments;
    return this.replace(/\{(\d+)\}/g, function(s,i){
        return args[i];
    });
}

var eg = new Object();

eg.workspace = null;
eg.DefaultGridSize = { width: 10, height: 10 };
eg.gridSize = null;
eg.horLines = null;
eg.verLines = null;

eg.init = function ($workspace, gridWidth, gridHeight) {
    eg.workspace = $workspace;
    eg.gridSize = {
        width : gridWidth  || eg.DefaultGridSize.width,
        height: gridHeight || eg.DefaultGridSize.height
    };
    eg.horLines = [];
    eg.verLines = [];
};

/**
 * Return the index that target should insert to the lines
 */
eg.findLine = function (target, lines) {
    var l = 0, r = lines.length, m;
    while (l < r - 1) {
        m = (l + r) >> 1;
        if (lines[m].val == target) return m;
        else if (lines[m].val < target) l = m;
        else r = m;
    }
    return (l == r - 1 && lines[l].val < target) ? l + 1 : l;
};

eg.addLine = function (value, lines) {
    var idx = eg.findLine(value, lines);
    if (idx == lines.length || lines[idx].val != value) {
        lines.splice(idx, 0, { val: value, num: 1 });
    } else {
        lines[idx].num++;
    }
};

eg.delLine = function (value, lines) {
    var idx = eg.findLine(value, lines);
    if (idx == lines.length) return;
    if (lines[idx].val == value) {
        if (lines[idx].num > 1) {
            lines[idx].num--;
        } else {
            lines.splice(idx, 1);
        }
    }
};

eg.closetValue = function (value, minVal, start, gap, lines) {
    if (value <= minVal) return minVal;
    var offset = start % gap;
    var gapVal = Math.floor(value / gap) * gap + offset;
    if (value - gapVal > gapVal + gap - value)
        gapVal += gap;

    if (lines == null || lines.length == 0) return gapVal;
    var idx = eg.findLine(value, lines);
    if (idx != 0 && (idx == lines.length || lines[idx].val + lines[idx - 1].val > value * 2))
        idx--;
    return Math.abs(gapVal - value) < Math.abs(lines[idx].val - value) 
            ? gapVal : lines[idx].val;
};

eg.closetGridPos = function (position, oriPos, gridSize, horLines, verLines) {
    var ret = new Object();
    ret.top  = eg.closetValue(position.top,  0, horLines ? oriPos.top : 0,  gridSize.height, horLines);
    ret.left = eg.closetValue(position.left, 0, verLines ? oriPos.left : 0, gridSize.width,  verLines);
    return ret;
};

eg.closetGridSize = function (pos, size, oriPos, oriSize, gridSize, horLines, verLines) {
    var ret = { top: pos.top, left: pos.left, height: size.height, width: size.width };
    if (oriPos.left != pos.left) {
        ret.left = eg.closetValue(pos.left, 0, verLines ? oriPos.left : 0, gridSize.width,  verLines);
        ret.width = oriPos.left + oriSize.width - ret.left;
    } else if (oriSize.width != size.width) {
        ret.width = eg.closetValue(pos.left + size.width, 0, 
            verLines ? oriPos.left + oriSize.width : 0, gridSize.width,  verLines) - pos.left;
    }
    if (oriPos.top != pos.top) {
        ret.top  = eg.closetValue(pos.top,  0, horLines ? oriPos.top : 0,  gridSize.height, horLines);
        ret.height = oriPos.top + oriSize.height - ret.top;
    } else if (oriSize.height != size.height) {
        ret.height = eg.closetValue(pos.top + size.height,  0, 
            horLines ? oriPos.top + oriSize.height : 0,  gridSize.height, horLines) - pos.top;
    }
    return ret;
};

eg.DragFunc = function (event, ui) {
    if (event.shiftKey) {
        ui.position = eg.closetGridPos(ui.position, ui.originalPosition,
            eg.gridSize, null, null);
    } else if (!event.ctrlKey) {
        ui.position = eg.closetGridPos(ui.position, ui.originalPosition, 
            eg.gridSize, eg.horLines, eg.verLines);
    }
};

eg.EndDragNResize = function (event, ui) {
    eg.delLine(ui.originalPosition.top, eg.horLines);
    eg.delLine(ui.originalPosition.left, eg.verLines);
    eg.addLine(ui.position.top, eg.horLines);
    eg.addLine(ui.position.left, eg.verLines);
    if (ui.originalSize) {
        eg.delLine(ui.originalPosition.top + ui.originalSize.height, eg.horLines);
        eg.delLine(ui.originalPosition.left + ui.originalSize.width, eg.verLines);
        eg.addLine(ui.position.top + ui.size.height, eg.horLines);
        eg.addLine(ui.position.left + ui.size.width, eg.verLines);
    } else {
        eg.delLine(ui.originalPosition.top + ui.helper.height(), eg.horLines);
        eg.delLine(ui.originalPosition.left + ui.helper.width(), eg.verLines);
        eg.addLine(ui.position.top + ui.helper.height(), eg.horLines);
        eg.addLine(ui.position.left + ui.helper.width(), eg.verLines);
    }
    refreshLines(true);
};

eg.ResizeFunc = function (event, ui) {
    // $("#log").html("top: {0}, left: {1}, width: {2}, height: {3}".format(ui.position.top, ui.position.left, ui.size.width, ui.size.height));
    /**
     * jQuery ui has its own function for holding SHIFT key, 
     * which is invoked before this, 
     * and the params will not be what I want 
     */
    /*if (event.shiftKey) {
        var ret = eg.closetGridSize(ui.position, ui.size, 
            ui.originalPosition, ui.originalSize, eg.gridSize, null, null);
        ui.position.top = ret.top;
        ui.position.left = ret.left;
        ui.size.width = ret.width;
        ui.size.height = ret.height;
    } else */
    if (!event.ctrlKey) {
        var ret = eg.closetGridSize(ui.position, ui.size, 
            ui.originalPosition, ui.originalSize, eg.gridSize, eg.horLines, eg.verLines);
        ui.position.top = ret.top;
        ui.position.left = ret.left;
        ui.size.width = ret.width;
        ui.size.height = ret.height;
    }
    // $("#log2").html("top: {0}, left: {1}, width: {2}, height: {3}".format(ui.position.top, ui.position.left, ui.size.width, ui.size.height));
};

var addObject = function (event, top, left, width, height) {
    top = top || 100;
    left = left || 100;
    width = width || 150;
    height = height || 100;

    var testObj = $('<div class="eg-test"></div>');
    testObj.css("height", height);
    testObj.css("width", width);
    testObj.css("top", top);
    testObj.css("left", left);

    testObj.resizable({
        handles: "n, s, w, e, ne, se, nw, sw",
        resize: eg.ResizeFunc,
        stop: eg.EndDragNResize,
    });

    testObj.draggable({
        drag: eg.DragFunc,
        stop: eg.EndDragNResize,
    });

    eg.workspace.find(".grid").append(testObj);
    eg.addLine(left, eg.verLines);
    eg.addLine(left + width, eg.verLines);
    eg.addLine(top, eg.horLines);
    eg.addLine(top + height, eg.horLines);
};

var refreshLines = function (show) {
    $(".vertial-line").remove();
    $(".horizontal-line").remove();
    if (show) {
        for (var i = 0; i < eg.horLines.length; i++) {
            var line = $('<div class="horizontal-line"></div>');
            line.css("left", 0);
            line.css("top", eg.horLines[i].val);
            eg.workspace.find(".grid").append(line);
        }
        for (var i = 0; i < eg.verLines.length; i++) {
            var line = $('<div class="vertial-line"></div>');
            line.css("top", 0);
            line.css("left", eg.verLines[i].val);
            eg.workspace.find(".grid").append(line);
        }
    }
};

$(document).ready(function () {
    eg.init($("#eg-workspace"), 10, 10);

    $("#addObject").click(addObject);
    $(".grid").width(eg.workspace.width());
    $(".grid").height(eg.workspace.height());
});