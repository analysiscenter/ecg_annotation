import React from 'react'

export default class EcgSignalPlot extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      width: 0,
      height: 0,
      id: null
    }

    this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this)
    this.componentDidMount = this.componentDidMount.bind(this)
  }

  componentDidMount () {
    if ((this.props.signal !== null)) {
      this.setState({id: this.props.id,
        width: this.props.width,
        height: this.props.height})
      MakeSubplots(this.props.signal,
        this.props.fs,
        this.props.signame,
        this.props.units,
        this.props.layoutType,
        this.props.width,
        this.props.height,
        this.props.divId)
    }
  }

  componentWillReceiveProps (nextProps) {
    if (this.state.id !== nextProps.id) {
      this.setState({id: nextProps.id})
      MakeSubplots(nextProps.signal,
        nextProps.fs,
        nextProps.signame,
        nextProps.units,
        nextProps.layoutType,
        nextProps.width,
        nextProps.height,
        nextProps.divId)
    }
    if ((this.state.width !== nextProps.width) || (this.state.height !== nextProps.height)) {
      this.setState({width: nextProps.width, height: nextProps.height})
      MakeSubplots(nextProps.signal,
        nextProps.fs,
        nextProps.signame,
        nextProps.units,
        nextProps.layoutType,
        nextProps.width,
        nextProps.height,
        nextProps.divId)
    }
  }

  render () {
    return (
      <div id={this.props.divId} />
    )
  }
}

function MakeSubplots (signal, fs, signame, units, layoutType, width, height, divId) {
  var traces = []
  var layout = {}

  switch (layoutType) {
    case '1x1':
      traces.push({
        x: Array.from(Array(signal.length).keys()).map(x => x / fs),
        y: signal.slice(),
        type: 'scatter',
        marker: {color: 'blue'},
        name: signame
      })

      layout = {
        margin: {
          t: 20,
          l: 40,
          r: 30
        },
        width: width,
        height: height,
        xaxis: {
          title: 'Время (сек)'
        },
        yaxis: {
          title: (units === 'mV') ? 'Амплитуда (мВ)' : 'Амплитуда (' + units + ')'
        },
        font: {
          family: 'Roboto Condensed',
          weight: 100,
          size: 12,
          color: '#999999'
        }
      }
      break

    case '6x2':
      for (var i = 0; i < signal.length; i++) {
        var trace = {
          x: Array.from(Array(signal[i].length).keys()).map(function (x) { return x / fs }),
          y: signal[i].slice(),
          xaxis: 'x' + (i + 1).toString(),
          yaxis: 'y' + (i + 1).toString(),
          type: 'scatter',
          marker: {color: 'blue'},
          name: signame[i]
        }
        traces.push(trace)
      };

      var annotations = []
      for (i = 0; i < 12; i++) {
        var annotation = {
          x: 0.5,
          y: Math.max(...traces[i].y),
          xref: traces[i].xaxis,
          yref: traces[i].yaxis,
          text: traces[i].name,
          font: {
            color: 'black',
            size: 22
          },
          showarrow: false
        }
        annotations.push(annotation)
      }

      const mx = 0.02
      const my = 0.03
      layout = {
        showlegend: false,
        autoscale: true,
        width: width,
        height: height,
        margin: {
          l: 20,
          r: 20,
          b: 0,
          t: 30
        },
        xaxis: {domain: [0, 0.5 - mx]},
        yaxis: {domain: [5.0 / 6.0 + my, 1]},
        xaxis12: {
          domain: [0.5 + mx, 1],
          anchor: 'y12'
        },
        xaxis11: {
          domain: [0.5 + mx, 1],
          anchor: 'y11'
        },
        xaxis10: {
          domain: [0.5 + mx, 1],
          anchor: 'y10'
        },
        xaxis9: {
          domain: [0.5 + mx, 1],
          anchor: 'y9'
        },
        xaxis8: {
          domain: [0.5 + mx, 1],
          anchor: 'y8'
        },
        xaxis7: {
          domain: [0.5 + mx, 1],
          anchor: 'y7'
        },
        xaxis6: {
          domain: [0.0, 0.5 - mx],
          anchor: 'y6'
        },
        xaxis5: {
          domain: [0.0, 0.5 - mx],
          anchor: 'y5'
        },
        xaxis4: {
          domain: [0.0, 0.5 - mx],
          anchor: 'y4'
        },
        xaxis3: {
          domain: [0.0, 0.5 - mx],
          anchor: 'y3'
        },
        xaxis2: {
          domain: [0.0, 0.5 - mx],
          anchor: 'y2'
        },
        yaxis2: {
          domain: [4.0 / 6.0 + my, 5.0 / 6.0 - my],
          anchor: 'x2'
        },
        yaxis3: {
          domain: [3.0 / 6.0 + my, 4.0 / 6.0 - my],
          anchor: 'x3'
        },
        yaxis4: {
          domain: [2.0 / 6.0 + my, 3.0 / 6.0 - my],
          anchor: 'x4'
        },
        yaxis5: {
          domain: [1.0 / 6.0 + my, 2.0 / 6.0 - my],
          anchor: 'x5'
        },
        yaxis6: {
          domain: [0, 1.0 / 6.0 - my],
          anchor: 'x6'
        },
        yaxis7: {
          domain: [5.0 / 6.0 + my, 1],
          anchor: 'x7'
        },
        yaxis8: {
          domain: [4.0 / 6.0 + my, 5.0 / 6.0 - my],
          anchor: 'x8'
        },
        yaxis9: {
          domain: [3.0 / 6.0 + my, 4.0 / 6.0 - my],
          anchor: 'x9'
        },
        yaxis10: {
          domain: [2.0 / 6.0 + my, 3.0 / 6.0 - my],
          anchor: 'x10'
        },
        yaxis11: {
          domain: [1.0 / 6.0 + my, 2.0 / 6.0 - my],
          anchor: 'x11'
        },
        yaxis12: {
          domain: [0, 1.0 / 6.0 - my],
          anchor: 'x12'
        },
        annotations: annotations
      }
      break
    default:
      break
  }

  Plotly.react(divId, traces, layout)
}
