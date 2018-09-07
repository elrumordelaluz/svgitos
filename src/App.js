import React, { Component, createElement, cloneElement } from 'react'
import uuid from 'uuid/v4'
import './App.css'

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
  }

  setElem = e => {
    this.setState({ elem: e.target.value })
  }

  onMouseDown = e => {
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
                    // onMouseDown: e => {
                    //   e.stopPropagation()
                    //   const { offsetX: x, offsetY: y } = e.nativeEvent
                    //   this.startMoveElem({ id: editingElem.props.id, x, y })
                    // },
                    // onMouseMove: this.moveElem,
                    // onMouseUp: this.stopMoveElem,
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
    this.setState(({ stack }) => ({
      _origin: { x, y },
      _current: { x, y },
      _last: { x, y },
      editingElem: cloneElement(stack[id]),
      editingId: id,
    }))
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
      return {
        editingElem: cloneElement(editingElem, {
          transform: `translate(${x - _current.x} ${y - _current.y})`,
        }),
      }
    })
  }

  stopMoveElem = e => {
    e.stopPropagation()
    this.setState(({ stack, editingElem, editingId }) => ({
      stack: {
        ...stack,
        [editingId]: editingElem,
      },
      editingElem: null,
      editingId: null,
      _origin: null,
      _current: null,
      _last: null,
    }))
  }

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
