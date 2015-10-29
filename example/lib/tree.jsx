import React from 'react';
import vis from 'vis';
import uuid from 'uuid';

// Adapted from https://github.com/crubier/react-graph-vis
// The MIT License (MIT)
// Copyright (c) 2015 Vincent Lecrubier

class Tree extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hierarchicalLayout: true
        };
    }

    render() {
        return React.createElement("div", {onDoubleClick: this.changeMode, id: this.props.identifier, style: this.props.style}, this.props.identifier);
    }

    changeMode(event) {
        this.setState({hierarchicalLayout: !this.state.hierarchicalLayout});
        this.updateGraph();
    }

    componentDidMount() {
        this.updateGraph();
    }

    componentDidUpdate() {
        this.updateGraph();
    }

    updateGraph() {
        // Container
        var container = document.getElementById(this.props.identifier);

        // Options
        var options = {
            physics: {
                stabilization: {
                    enabled: true,
                },
            },
            edges: {
                color: '#5d5858',
                width: 0.5,
                arrows: { to: { scaleFactor: 0.5 }},
                smooth: { enabled: false },
            },
            nodes: {
                color: {
                    background: '#5d5858',
                    border: '#5d5858',
                },
                font: {
                    color: '#ffffff',
                }
            }
        };

        if (this.state.hierarchicalLayout) {
            options.layout = {
                hierarchical: {
                    enabled: true,
                    direction: "UD",
                    levelSeparation:100,
                },
            };
        } else {
            options.layout = {
                hierarchical: {
                    enabled: false,
                },
            };
        }

        var network = new vis.Network(container, this.props.graph, options);
      }
}

Tree.defaultProps = {
    graph: {},
    identifier: uuid.v4(),
    style: { width:"640px", height:"480px" },
};

export default Tree;
