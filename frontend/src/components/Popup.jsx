import React from 'react'
import { inject, observer } from 'mobx-react'
import { Grid, Row, Button } from 'react-bootstrap'
import LoadingSpinner from './LoadingSpinner.jsx'

@inject("ecgStore")
@observer
export default class Popup extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      waitingZip: false
    }

    this.handleZipApproved = this.handleZipApproved.bind(this)
  }

  handleZipApproved () {
    this.props.ecgStore.makeZip()
    this.setState({waitingZip: true})
  }

  renderApproveZip () {
    return (
      <div className='popup'>
        <div className='popup-inner'>
          <Grid>
            <Row>
              <span className='popup-text'>
                Продолжив, все размеченные ЭКГ
                будут отправлены в архив и удалены из списка ЭКГ. Продолжить?
              </span>
            </Row>
            <Row>
              <Button type='submit'
                bsStyle='success'
                className='button-left'
                onClick={this.handleZipApproved}>Да</Button>
              <Button type='submit'
                bsStyle='success'
                className='button-right'
                onClick={() => this.props.handleShowPopup(false)}>Нет</Button>
            </Row>
          </Grid>
        </div>
      </div>
    )
  }

  renderWaitingZip () {
    if (this.props.ecgStore.waitingZip) {
      return (
        <div className='popup'>
          <div className='popup-inner'>
            <div className='popup-text'>
              <LoadingSpinner text='Идет архивация файлов. Пожалуйста, подождите.' />
            </div>
          </div>
        </div>
      )
    } else {
      return (
        <div className='popup'>
          <div className='popup-inner'>
            <Grid>
              <Row>
                <span className='popup-text'>
                  Архивация завершена.
                </span>
              </Row>
              <Row>
                <Button type='submit'
                  bsStyle='success'
                  className='button-middle'
                  onClick={() => this.props.handleShowPopup(false)}>Вернуться на главную страницу</Button>
              </Row>
            </Grid>
          </div>
        </div>
      )
    }
  }

  render () {
    return (
      <div>
        {(this.state.waitingZip)
          ? this.renderWaitingZip()
          : this.renderApproveZip()
        }
      </div>
    )
  }
}
