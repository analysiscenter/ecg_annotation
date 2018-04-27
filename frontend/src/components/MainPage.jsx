import React from 'react'
import { Grid, Row, Col, Button, FormGroup, Checkbox, FormControl } from 'react-bootstrap'
import { Icon } from 'react-fa'
import { inject, observer } from 'mobx-react'

import LoadingSpinner from './LoadingSpinner.jsx'
import EcgSignalPlot from './EcgSignalPlot.jsx'
import Popup from './Popup.jsx'

@inject("ecgStore")
@observer
export default class MainPage extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      selectedChannel: 0,
      viewAllChannels: true,
      pid: null,
      annotation: [],
      descentSort: false,
      signame: null,
      hideAnnotated: false,
      showGroups: [],
      searchString: '',
      collapseAllGroups: true,
      showCommon: true,
      browserWidth: 0,
      browserHeight: 0,
      currentEcgListKey: 0,
      showPopup: false
    }

    this.handleShowPopup = this.handleShowPopup.bind(this)
  }

  handleAnnSelect (e) {
    this.setState({annotation: this.state.annotation.concat(e.target.value)})
  }

  handleCollapseAllGroups (e) {
    if (!this.state.collapseAllGroups) {
      this.setState({showGroups: []})
    } else {
      var allGroups = []
      for (let item of this.props.ecgStore.annotationList.values()) {
        item.annotations.length > 0 ? allGroups.push(item.id) : null
      }
      this.setState({showGroups: allGroups})
    }
    this.setState({collapseAllGroups: !this.state.collapseAllGroups})
  }

  handleCollapseCommon (e) {
    this.setState({showCommon: !this.state.showCommon})
  }

  handleEcgSelect (e) {
    this.setState({pid: e.target.value})
  }

  handleHideAnnotated (e) {
    this.setState({hideAnnotated: !this.state.hideAnnotated})
  }

  handleLayoutChange (e) {
    this.setState({viewAllChannels: !this.state.viewAllChannels})
  }

  handleSelectChannel (e) {
    let value = parseInt(e.target.value)
    this.setState({selectedChannel: value})
  }

  handleSetAnnotation (e) {
    let value = e.target.value
    if (this.state.annotation.includes(value)) {
      var filtered = this.state.annotation.filter(t => t !== value)
      this.setState({annotation: filtered})
    } else {
      this.setState({annotation: this.state.annotation.concat(value)})
    }
  }

  handleShowGroup (value) {
    if (this.state.showGroups.includes(value)) {
      var filtered = this.state.showGroups.filter(t => t !== value)
      this.setState({showGroups: filtered})
    } else {
      this.setState({showGroups: this.state.showGroups.concat(value)})
    }
  }

  handleShowPopup (value) {
    this.setState({showPopup: value})
  }

  handleSort (e) {
    this.setState({descentSort: !this.state.descentSort})
  }

  handleSubmit (e) {
    let pid = this.state.pid
    var item = this.props.ecgStore.items.get(pid)
    item.annotation = this.state.annotation
    item.isAnnotated = true
    this.props.ecgStore.setAnnotation(pid, this.state.annotation)
    this.setState({annotation: []})
  }

  countAnnotated () {
    return this.props.ecgStore.items.values().filter((x) => x.isAnnotated).length
  }

  showEcgName (item, index) {
    return (
      !(this.state.hideAnnotated & item.isAnnotated)
        ? <option value={item.id}
          key={index}
          style={{color: item.isAnnotated ? '#28a745' : 'black'}}
          className='ecg-item-name'>
          {item.timestamp.slice(0, 5) + item.timestamp.slice(10, 16)}
        </option>
        : null
    )
  }

  parseEcgDate (str) {
    return new Date(str.slice(6, 10) + '-' +
      str.slice(3, 5) + '-' +
      str.slice(0, 2) + 'T' +
      str.slice(11, 19))
    }

  sortedList () {
    let that = this
    var sorted = this.props.ecgStore.items.values().sort(function (a, b) {
      return (that.parseEcgDate(b.timestamp) - that.parseEcgDate(a.timestamp))
    })
    if (this.state.descentSort) {
      return (
        sorted.map((item, index) => this.showEcgName(item, index))
      )
    } else {
      return (
        sorted.slice(0).reverse().map((item, index) => this.showEcgName(item, index))
      )
    }
  }

  renderCheckBox () {
    let item = this.props.ecgStore.get(this.state.pid)
    if (item.signame !== null) {
      let channels = [...Array(item.signame.length).keys()]
      return (
        <Row className='button-group'>
          {channels.map((x, key) => <Button value={x}
            key={key}
            type='submit'
            className='set-channel'
            onClick={this.handleSelectChannel.bind(this)}
            bsStyle={(this.state.selectedChannel === x)
              ? 'primary' : 'default'}>{item.signame[x]}</Button>)}
        </Row>
      )
    }
  }

  renderCommonItems (diagnose, index) {
    return (
      <Checkbox value={diagnose}
        key={index}
        checked={this.state.annotation.includes(diagnose)}
        onChange={this.handleSetAnnotation.bind(this)}>
        { diagnose.split('/').slice(-1)[0] }
      </Checkbox>
    )
  }

  renderDropdownList (groupName, items, index) {
    if (items.length === 0) {
      if (groupName.toLowerCase().includes(this.state.searchString)) {
        return (
          <Checkbox value={groupName}
            key={index}
            checked={this.state.annotation.includes(groupName)}
            onChange={this.handleSetAnnotation.bind(this)}>
            {groupName}
          </Checkbox>
        )
      } else { return null }
    } else {
      let maskItems = items.filter(item => item.toLowerCase().includes(this.state.searchString))
      let isCollapsed = !(this.state.showGroups.includes(groupName) || (this.state.searchString.length > 0))
      return (
        <Row className={isCollapsed ? 'collapsed-group' : 'enrolled-group'} key={index}>
          <span value={groupName} onClick={this.handleShowGroup.bind(this, groupName)}>
            <Icon name={!isCollapsed ? 'angle-down' : 'angle-right'} />
            <span className='group-name'>{groupName}</span>
          </span>

          { !isCollapsed
            ? <Row className='group-items'>
              {maskItems.map((item, index) =>
                <Checkbox value={groupName + '/' + item}
                  key={index}
                  checked={this.state.annotation.includes(groupName + '/' + item)}
                  onChange={this.handleSetAnnotation.bind(this)}>{item}</Checkbox>)
              }
            </Row>
            : null
          }
        </Row>
      )
    }
  }

  renderDropdownMenu () {
    return (
      <Row>
        <FormGroup>
          {this.props.ecgStore.annotationList.values().map((item, index) =>
            this.renderDropdownList(item.id, item.annotations, index))}
        </FormGroup>
      </Row>
    )
  }

  renderEcgList () {
    return (
      <Row>
        <FormGroup controlId='formControlsSelectMultiple' key={this.state.currentEcgListKey}>
          <FormControl componentClass='select'
            className='ecg-list'
            multiple
            value={this.state.pid !== null ? [this.state.pid] : ['']}
            onChange={this.handleEcgSelect.bind(this)}>
            { this.sortedList() }
          </FormControl>
        </FormGroup>
      </Row>
    )
  }

  renderEcgPlot () {
    let item = this.props.ecgStore.get(this.state.pid)
    if (item === undefined) {
      return null
    }
    if (item.waitingData) {
      return null
    }
    if (this.state.viewAllChannels) {
      return (
        <EcgSignalPlot signal={item.signal}
          id={item.id}
          fs={item.frequency}
          signame={item.signame}
          units={item.units}
          layoutType='6x2'
          width={0.65 * this.state.browserWidth}
          height={0.7 * this.state.browserHeight}
          divId='subplots' />
      )
    } else {
      let channel = this.state.selectedChannel
      return (
        <Col>
          <Row>
            {this.renderCheckBox()}
          </Row>
          <Row>
            <EcgSignalPlot signal={item.signal[channel]}
              id={item.id + channel}
              fs={item.frequency}
              signame={item.signame[channel]}
              units={item.units[channel]}
              layoutType='1x1'
              width={0.65 * this.state.browserWidth}
              height={0.7 * this.state.browserHeight}
              divId='subplots' />
          </Row>
        </Col>
      )
    }
  }

  renderSearch () {
    return (
      <FormGroup controlId='formBasicText'>
        <FormControl type='text'
          placeholder='Текст для поиска'
          className='search-line'
          onChange={e => this.setState({searchString: e.target.value.toLowerCase()})} />
      </FormGroup>
    )
  }

  componentDidUpdate (prevProps, prevState, snapshot) {
    var item = prevProps.ecgStore.items.get(prevState.pid)
    if (item === undefined & prevState.pid !== null) {
      this.setState({pid: null,
        currentEcgListKey: (this.state.currentEcgListKey + 1) % 2})
    }
  }

  updateDimensions () {
    this.setState({browserWidth: window.innerWidth,
      browserHeight: window.innerHeight})
  }

  componentDidMount () {
    this.updateDimensions()
    window.addEventListener('resize', this.updateDimensions.bind(this))
  }

  render () {
    if (!this.props.ecgStore.readyEcgList ||
        !this.props.ecgStore.readyAnnotationList) {
      return (
        <LoadingSpinner text='Получение данных от сервера' />
      )
    } else {
      return (
        <div className='page'>
          <Grid fluid>
            <Row>
              <Col className='left-column'>
                <Row>
                  <span className='headline'>Список ЭКГ</span>
                </Row>
                <Row>
                  <a href='#'
                    className='inline-controll margin-top'
                    onClick={this.handleHideAnnotated.bind(this)}>
                    {this.state.hideAnnotated ? 'Показать все' : 'На расшифровку'}
                  </a>
                </Row>
                <Row>
                  <a href='#'
                    className='inline-controll'
                    onClick={this.handleSort.bind(this)}>
                    {this.state.descentSort ? 'Сначала старые' : 'Сначала новые'}
                  </a>
                </Row>
                <Row>
                  {this.renderEcgList()}
                </Row>
                <Row className='zip-bottom'>
                  {(this.state.showPopup)
                    ? <Popup handleShowPopup={this.handleShowPopup} />
                    : null
                  }
                  <Button type='submit'
                    bsStyle='default'
                    className='submit'
                    disabled={this.countAnnotated() === 0}
                    onClick={() => this.handleShowPopup(true)}>В архив ({this.countAnnotated()})</Button>
                </Row>
              </Col>
              <Col className='middle-column'>
                <Row className='headline'>
                  Результат расшифровки
                </Row>
                <Row className='margin-top'>
                  {(this.props.ecgStore.items.get(this.state.pid) !== undefined)
                    ? ((this.props.ecgStore.items.get(this.state.pid).isAnnotated)
                      ? this.props.ecgStore.items.get(this.state.pid).annotation.map(x => { return x.split('/').slice(-1)[0] }).join(', ')
                      : 'Выберите значения из справочника и нажмите кнопку Сохранить'
                    )
                    : null
                  }
                </Row>
                <Row className='headline margin-top'>
                  Просмотр ЭКГ
                  {(this.props.ecgStore.items.get(this.state.pid) !== undefined)
                    ? ' ' + this.props.ecgStore.items.get(this.state.pid).timestamp
                    : null
                  }
                </Row>
                <Row className='margin-top'>
                  <span>
                    Показать отведения
                    <a href='#' className='inline-controll' onClick={this.handleLayoutChange.bind(this)}>
                      {this.state.viewAllChannels ? ' по-одному' : ' все'}
                    </a>
                  </span>
                </Row>
                {(this.props.ecgStore.items.values().length === 0)
                  ? <Row><span className='centered-text'>Список ЭКГ пуст</span></Row>
                  : ((this.state.pid !== null & this.state.showPopup === false)
                    ? <Row>{this.renderEcgPlot()}</Row>
                    : <Row><span className='centered-text'>Выберите ЭКГ из списка</span></Row>
                  )
                }
              </Col>
              <div className='vline' />
              <Col className='right-column'>
                <Row className='headline'>
                  Расшифровка ЭКГ
                </Row>
                <Row>
                  <span className='headline subsection'><span>Популярное</span>
                    <a href='#' onClick={this.handleCollapseCommon.bind(this)}>
                      {this.state.showCommon ? 'свернуть' : 'развернуть'}
                    </a>
                  </span>
                </Row>
                {this.state.showCommon
                  ? <Row className='common-items-list'>
                    <FormGroup>
                      {this.props.ecgStore.commonAnnotations.values().map((item, index) =>
                        this.renderCommonItems(item, index))}
                    </FormGroup>
                  </Row>
                  : null
                }
                <Row>
                  <span className='headline subsection2'>
                    <span>Справочник</span>
                    <a href='#' onClick={this.handleCollapseAllGroups.bind(this)}>
                      {this.state.collapseAllGroups ? 'развернуть' : 'свернуть'}
                    </a>
                  </span>
                </Row>
                <Row>
                  {this.renderSearch()}
                </Row>
                <Row className={this.state.showCommon ? 'short-list' : 'full-list'}>
                  {this.props.ecgStore.annotationList.values().map((item, index) =>
                    this.renderDropdownList(item.id, item.annotations, index))}
                </Row>
                <Row className='bottom'>
                  <Button type='submit'
                    bsStyle='success'
                    className='submit'
                    disabled={this.state.annotation.length === 0 || this.state.pid === null}
                    onClick={this.handleSubmit.bind(this)}>Сохранить</Button>
                </Row>
              </Col>
            </Row>
          </Grid>
        </div>
      )
    }
  }
}
