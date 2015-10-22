import React from 'react';
import D3 from 'd3';

class Tree extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            size: {
                height: 800,
                width: 600,
            },
            options: {
                fontSize: 8,
                nodeRadius: 10,
            },
            maxLabelLength: 20,
        }
    }

    initTree(props) {
        var tree = d3.layout.tree()
            .sort(null)
            .size([
                this.state.size.height,
                this.state.size.width - this.state.maxLabelLength * this.state.options.fontSize])
            .children(function(d) {
                return (!d.children || d.children.length === 0) ? null : d.children;
            });

        let nodes = tree.nodes(this.props.data);
        this.setState({ nodes: nodes, links: tree.links(nodes), tree: tree });
    }

    componentWillMount() {
        this.initTree(this.props);
    }

    componentDidMount() {
        this.recalcTree();
    }

    componentWillReceiveProps(props) {
        this.initTree(props);
        this.recalcTree();
    }

    recalcTree() {
        var container = document.getElementById('treeContainer');
        var existing = container.firstChild;
        console.log('EXISTING', existing);
        if (existing) {
            container.removeChild(existing);
        }
        var layoutRoot = d3.select('#treeContainer')
            .append("svg:svg")
                .attr("width", this.state.size.width)
                .attr("height", this.state.size.height)
            .append("svg:g")
            .attr("class", "container")
            .attr("transform", "translate(" + this.state.maxLabelLength + ",0)");

        // Edges between nodes as a <path class="link" />
        var link = d3.svg.diagonal()
            .projection(function(d)
            {
                return [d.y, d.x];
            });

            layoutRoot.selectAll("path.link")
                .data(this.state.links)
                .enter()
                .append("svg:path")
                .attr("class", "link")
                .attr("d", link);


        /*
            Nodes as
            <g class="node">
                <circle class="node-dot" />
                <text />
            </g>
         */
        var nodeGroup = layoutRoot.selectAll("g.node")
            .data(this.state.nodes)
            .enter()
            .append("svg:g")
            .attr("class", "node")
            .attr("transform", function(d)
            {
                return "translate(" + d.y + "," + d.x + ")";
            });

        nodeGroup.append("svg:circle")
            .attr("class", "node-dot")
            .attr("r", this.state.options.nodeRadius);

        nodeGroup.append("svg:text")
            .attr("text-anchor", function(d)
            {
                return d.children ? "end" : "start";
            })
            .attr("dx", d => {
                var gap = 2 * this.state.options.nodeRadius;
                return d.children ? -gap : gap;
            })
            .attr("dy", 3)
            .text(function(d)
            {
                return d.name;
            });
    }

    render() {
        return <div id='tree'><div id='treeContainer'></div></div>;
    }
}

export default Tree;
