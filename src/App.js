import React, { Component, createElement, cloneElement } from 'react'
import uuid from 'uuid/v4'
import './App.css'

// https://gist.github.com/petersirka/dfac415e1e1e4993af826c0ff706eb4d
const parseTransform = str => {
  var val = str.match(/(translate|matrix|rotate|skewX|skewY|scale)\(.*?\)/g)
  var obj = {}
  if (val) {
    for (var i = 0, length = val.length; i < length; i++) {
      var item = val[i]
      var index = item.indexOf('(')
      var v = item.substring(index + 1, item.length - 1).split(/,|\s/)
      var n = item.substring(0, index)
      obj[n] = {}
      switch (n) {
        case 'translate':
        case 'scale':
          obj[n].x = +v[0] || 0
          obj[n].y = +v[1] || 0
          break
        case 'rotate':
          obj[n].a = +v[0] || 0
          obj[n].x = +v[1] || 0
          obj[n].y = +v[2] || 0
          break
        case 'skewX':
        case 'skewY':
          obj[n].a = +v[0]
          break
        case 'matrix':
          obj[n].a = +v[0] || 0
          obj[n].b = +v[1] || 0
          obj[n].c = +v[2] || 0
          obj[n].d = +v[3] || 0
          obj[n].e = +v[4] || 0
          obj[n].f = +v[5] || 0
          break
        default:
      }
    }
  }
  return obj
}

class App extends Component {
  state = {
    elem: 'path',
    fill: '#b4d455',
    stroke: '#f67',
    strokeWidth: 4,
    stack: {},
    editingElem: null,
    editingId: null,
    creatingElem: false,
    _origin: null,
    _last: null,
    _current: null,
    tool: 'draw',
  }

  setElem = e => {
    this.setState({ elem: e.target.value })
  }

  selectTool = tool => this.setState({ tool })

  onMouseDown = e => {
    if (this.state.tool === 'draw') {
      const { offsetX: x, offsetY: y } = e.nativeEvent
      this.setState(({ elem, fill, stroke, strokeWidth }) => {
        const id = uuid()
        return {
          editingElem: createElement(elem, {
            fill,
            stroke,
            strokeWidth,
            ...(elem === 'path' ? { d: `M ${x} ${y}` } : {}),
            id,
          }),
          editingId: id,
          _origin: { x, y },
          _last: { x, y },
          _current: { x, y },
          creatingElem: true,
        }
      })
    }
  }

  onMouseMove = e => {
    const { offsetX: x, offsetY: y } = e.nativeEvent
    if (this.state._origin === null || !this.state.creatingElem) {
      return
    }
    const _init = {
      x: Math.min(x, this.state._origin.x),
      y: Math.min(y, this.state._origin.y),
    }
    const _end = {
      x: Math.max(x, this.state._origin.x),
      y: Math.max(y, this.state._origin.y),
    }
    this.setState(({ _current, editingElem, _origin }) => ({
      _last: _current,
      _current: { x, y },
      editingElem: cloneElement(editingElem, {
        ...(editingElem.type === 'path'
          ? {
              d: `${editingElem.props.d} l ${x - _current.x} ${y - _current.y}`,
            }
          : {}),
        ...(editingElem.type === 'line'
          ? {
              x1: _origin.x,
              y1: _origin.y,
              x2: x,
              y2: y,
            }
          : {}),
        ...(editingElem.type === 'rect'
          ? {
              x: _init.x,
              y: _init.y,
              width: _end.x - _init.x,
              height: _end.y - _init.y,
            }
          : {}),
        ...(editingElem.type === 'circle'
          ? {
              cx: (_init.x + _end.x) / 2,
              cy: (_init.y + _end.y) / 2,
              r: Math.max(_end.x - _init.x, _end.y - _init.y) / 2,
            }
          : {}),
        ...(editingElem.type === 'ellipse'
          ? {
              cx: (_init.x + _end.x) / 2,
              cy: (_init.y + _end.y) / 2,
              rx: (_end.x - _init.x) / 2,
              ry: (_end.y - _init.y) / 2,
            }
          : {}),
      }),
    }))
  }

  onMouseUp = e => {
    const { _origin, _current, _last } = this.state
    if (_origin && _current && _last) {
      this.setState(({ stack, editingElem, editingId, _origin, _current }) => {
        return {
          stack: {
            ...stack,
            ...(_origin.x !== _current.x || _origin.y !== _current.y
              ? {
                  [editingId]: cloneElement(editingElem, {
                    opacity: null,
                    onMouseDown: e => {
                      e.stopPropagation()
                      const { offsetX: x, offsetY: y } = e.nativeEvent
                      this.startMoveElem({ id: editingElem.props.id, x, y })
                    },
                    onMouseMove: null,
                  }),
                }
              : {}),
          },
          editingElem: null,
          editingId: null,
          _origin: null,
          _current: null,
          _last: null,
          creatingElem: false,
        }
      })
    }
  }

  startMoveElem = ({ id, x, y }) => {
    if (this.state.tool === 'select') {
      this.setState(({ stack }) => ({
        _origin: { x, y },
        _current: { x, y },
        _last: { x, y },
        editingElem: cloneElement(stack[id], {
          onMouseMove: this.moveElem,
          // onMouseUp: this.stopMoveElem,
          opacity: 0.5,
        }),
        editingId: id,
      }))
    } else if (this.state.tool === 'fill') {
      this.setState(prevState => {
        return {
          stack: {
            ...prevState.stack,
            [id]: cloneElement(prevState.stack[id], {
              fill: 'blue',
            }),
          },
        }
      })
    }
  }

  moveElem = e => {
    if (!this.state.creatingElem) {
      e.stopPropagation()
    }
    if (this.state._origin === null) {
      return
    }

    const { offsetX: x, offsetY: y } = e.nativeEvent
    this.setState(({ _current, editingElem }) => {
      const parsed = editingElem.props.transform
        ? parseTransform(editingElem.props.transform)
        : { translate: { x: 0, y: 0 } }
      return {
        _last: _current,
        _current: { x, y },
        editingElem: cloneElement(editingElem, {
          transform: `translate(${parsed.translate.x + x - _current.x} ${parsed
            .translate.y +
            y -
            _current.y})`,
        }),
      }
    })
  }

  // stopMoveElem = e => {
  //   e.stopPropagation()
  //   this.setState(({ stack, editingElem, editingId }) => ({
  //     stack: {
  //       ...stack,
  //       [editingId]: cloneElement(editingElem, {
  //         opacity: null,
  //       }),
  //     },
  //     editingElem: null,
  //     editingId: null,
  //     _origin: null,
  //     _current: null,
  //     _last: null,
  //   }))
  // }

  render() {
    const { elem, stack, editingElem } = this.state
    return (
      <div className="app">
        <header className="controls">
          {['rect', 'line', 'circle', 'ellipse', 'path'].map(elem => (
            <label key={elem}>
              <input
                type="radio"
                name="elem"
                value={elem}
                onInput={this.setElem}
                defaultChecked={elem === 'path'}
              />{' '}
              {elem} <br />
            </label>
          ))}
          Elem: {elem}
          <br />
          {['select', 'draw', 'fill'].map(tool => (
            <button
              key={tool}
              onClick={() => this.selectTool(tool)}
              style={{
                backgroundColor:
                  tool === this.state.tool ? 'red' : 'transparent',
              }}
            >
              {tool}
            </button>
          ))}
        </header>
        <svg
          style={{ width: '500px', height: '500px', border: '1px solid' }}
          onMouseDown={this.onMouseDown}
          onMouseMove={this.onMouseMove}
          onMouseUp={this.onMouseUp}
        >
          {Object.keys(stack).map((elem, i) => {
            const element = stack[elem]
            return (
              <element.type key={`${element.type}_${i}`} {...element.props} />
            )
          })}
          {editingElem && editingElem}
        </svg>
      </div>
    )
  }
}

export default App
