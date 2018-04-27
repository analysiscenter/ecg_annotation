import React from 'react'
import { Icon } from 'react-fa'

export default class LoadingSpinner extends React.Component {
  render () {
    return (
      <div className='loading'>
        <Icon name='spinner' spin />
        { this.props.text ? <span>{' ' + this.props.text}</span> : null }
      </div>
    )
  }
}
