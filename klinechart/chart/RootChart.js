import CandleChart from './CandleChart'
import MarkerChart from './MarkerChart'
import IndicatorChart from './IndicatorChart'
import TooltipChart from './TooltipChart'
import XAxisChart from './XAxisChart'
import { isArray, isFunction, isNumber, merge } from '../internal/utils/dataUtils'
import { calcTextWidth } from '../internal/utils/drawUtils'
import calcIndicator from '../internal/calcIndicator'

import DataProvider from '../internal/DataProvider'

import { get } from '../config'
import { isMobile } from '../internal/utils/platformUtils'
import TouchEvent from '../internal/event/TouchEvent'
import MouseEvent from '../internal/event/MouseEvent'
import MarkerEvent from '../internal/event/MarkerEvent'

import { IndicatorType, YAxisPosition, YAxisTextPosition, MarkerType } from '../internal/constants'

class RootChart {
  constructor (dom, c = {}) {
    if (!dom) {
      throw new Error(`Chart version is ${process.env.K_LINE_VERSION}. Root dom is null, can not initialize the chart!!!`)
    }
    this.throttle = (func, wait) => {
      let previous = 0
      return () => {
        const now = Date.now()
        if (now - previous > wait) {
          func()
          previous = now
        }
      }
    }
    this.config = get()
    merge(this.config, c)
    dom.style.position = 'relative'
    this.dom = dom
    this.dataProvider = new DataProvider()
    this.xAxisChart = new XAxisChart(dom, this.config, this.dataProvider)
    this.candleChart = new CandleChart(dom, this.config, this.dataProvider)
    this.markerChart = new MarkerChart(dom, this.config, this.dataProvider, this.candleChart.yAxisRender)
    this.volIndicatorChart = new IndicatorChart(dom, this.config, this.dataProvider, IndicatorType.VOL)
    this.subIndicatorChart = new IndicatorChart(dom, this.config, this.dataProvider)
    this.tooltipChart = new TooltipChart(
      dom, this.config,
      this.candleChart,
      this.volIndicatorChart,
      this.subIndicatorChart,
      this.xAxisChart, this.dataProvider
    )
    this.calcChartDimensions()
    this.initEvent()
  }

  /**
   * 初始化事件
   */
  initEvent () {
    const onResize = this.throttle(() => {
      // 判断根元素大小是否发生变化，变化了才需要重新计算各个图表的尺寸
      if (this.domWidth !== this.dom.offsetWidth || this.domHeight !== this.dom.offsetHeight) {
        this.calcChartDimensions()
      }
    }, 1000 / 16)
    window.addEventListener('resize', onResize, false)
    const mobile = isMobile(window.navigator.userAgent)
    this.dom.addEventListener('contextmenu', (e) => { e.preventDefault() }, false)
    if (mobile) {
      const motionEvent = new TouchEvent(
        this.tooltipChart, this.candleChart,
        this.volIndicatorChart, this.subIndicatorChart,
        this.xAxisChart, this.dataProvider
      )
      this.dom.addEventListener('touchstart', (e) => { motionEvent.touchStart(e) }, false)
      this.dom.addEventListener('touchmove', (e) => { motionEvent.touchMove(e) }, false)
      this.dom.addEventListener('touchend', (e) => { motionEvent.touchEnd(e) }, false)
    } else {
      const motionEvent = new MouseEvent(
        this.tooltipChart, this.candleChart,
        this.volIndicatorChart, this.subIndicatorChart,
        this.xAxisChart, this.markerChart, this.dataProvider
      )
      const markerEvent = new MarkerEvent(this.dataProvider, this.markerChart, this.config)
      this.dom.addEventListener('mousedown', (e) => {
        motionEvent.mouseDown(e)
        markerEvent.mouseDown(e)
      }, false)
      this.dom.addEventListener('mouseup', (e) => {
        motionEvent.mouseUp(e)
        markerEvent.mouseUp(e)
      }, false)
      this.dom.addEventListener('mousemove', (e) => {
        motionEvent.mouseMove(e)
        markerEvent.mouseMove(e)
      }, false)
      this.dom.addEventListener('mouseleave', (e) => { motionEvent.mouseLeave(e) }, false)
      this.dom.addEventListener('wheel', (e) => { motionEvent.mouseWheel(e) }, false)
    }
  }

  /**
   * 刷新图
   * @param charts
   */
  flushCharts (charts = []) {
    for (const chart of charts) {
      chart.flush()
    }
  }

  /**
   * 计算图的尺寸
   */
  calcChartDimensions () {
    const xAxisHeight = this.calcXAxisHeight()
    const yAxisWidth = this.calcYAxisWidth()
    const domWidth = this.dom.offsetWidth
    const domHeight = this.dom.offsetHeight
    this.domWidth = domWidth
    this.domHeight = domHeight
    const contentHeight = domHeight - xAxisHeight
    let chartTop = 0
    let volChartHeight = 0
    let subIndicatorChartHeight = 0
    const isShowVolIndicator = this.volIndicatorChart.indicatorType !== IndicatorType.NO
    const isShowSubIndicator = this.subIndicatorChart.indicatorType !== IndicatorType.NO
    if (isShowVolIndicator && isShowSubIndicator) {
      const height = +((contentHeight * 0.2).toFixed(0))
      volChartHeight = height
      subIndicatorChartHeight = height
    } else if ((!isShowVolIndicator && isShowSubIndicator) || (isShowVolIndicator && !isShowSubIndicator)) {
      const height = +((contentHeight * 0.3).toFixed(0))
      if (isShowVolIndicator) {
        volChartHeight = height
      } else {
        subIndicatorChartHeight = height
      }
    }
    let offsetLeft = 0
    let offsetRight = 0
    if (this.config.yAxis.position === YAxisPosition.LEFT) {
      offsetLeft = yAxisWidth
    } else {
      offsetRight = yAxisWidth
    }
    this.dataProvider.space(domWidth - offsetRight - offsetLeft)
    this.xAxisChart.setChartDimensions(0, domWidth, domHeight, offsetLeft, offsetRight, 0, xAxisHeight)
    const candleChartHeight = contentHeight - volChartHeight - subIndicatorChartHeight
    this.candleChart.setChartDimensions(chartTop, domWidth, candleChartHeight, offsetLeft, offsetRight)
    this.markerChart.setChartDimensions(chartTop, domWidth, candleChartHeight, offsetLeft, offsetRight)
    chartTop += candleChartHeight
    this.volIndicatorChart.setChartDimensions(chartTop, domWidth, volChartHeight, offsetLeft, offsetRight)
    chartTop += volChartHeight
    this.subIndicatorChart.setChartDimensions(chartTop, domWidth, subIndicatorChartHeight, offsetLeft, offsetRight)
    this.tooltipChart.setChartDimensions(0, domWidth, domHeight, offsetLeft, offsetRight, 0, xAxisHeight)
  }

  /**
   * 计算x轴高度
   */
  calcXAxisHeight () {
    const xAxis = this.config.xAxis
    const tickText = xAxis.tick.text
    const tickLine = xAxis.tick.line
    let height = tickText.size + tickText.margin
    if (xAxis.display && tickLine.display) {
      height += tickLine.length
    }
    if (xAxis.display && xAxis.line.display) {
      height += xAxis.line.size
    }
    height = Math.max(xAxis.minHeight, Math.min(height, xAxis.maxHeight))
    return (+Math.ceil(Number(height)).toFixed(0))
  }

  /**
   * 计算y轴宽度
   */
  calcYAxisWidth () {
    const yAxis = this.config.yAxis
    const tickText = yAxis.tick.text
    const tickLine = yAxis.tick.line
    const needsOffset = (((tickText.display || tickLine.display || tickText.margin > 0) && tickText.position === YAxisTextPosition.OUTSIDE) || yAxis.line.display) && yAxis.display
    if (needsOffset) {
      let width = 0
      if (tickText.position === YAxisTextPosition.OUTSIDE) {
        width += calcTextWidth(tickText.size, '0000000') + tickText.margin
        if (yAxis.display && tickLine.display) {
          width += tickLine.length
        }
      }
      const axisLineSize = yAxis.line.size
      if (yAxis.display && yAxis.line.display) {
        width += axisLineSize
      }
      if (width > axisLineSize) {
        width = Math.max(yAxis.minWidth, Math.min(width, yAxis.maxWidth))
      }
      return Math.ceil(width)
    }
    return 0
  }

  /**
   * 计算图表指标
   */
  calcChartIndicator () {
    if (this.candleChart.indicatorType !== IndicatorType.NO) {
      this.calcIndicator(this.candleChart.indicatorType, this.candleChart)
    }
    if (this.volIndicatorChart.indicatorType !== IndicatorType.NO) {
      this.calcIndicator(IndicatorType.VOL, this.volIndicatorChart)
    }
    if (this.subIndicatorChart.indicatorType !== IndicatorType.NO) {
      this.calcIndicator(this.subIndicatorChart.indicatorType, this.subIndicatorChart)
    }
  }

  /**
   * 计算指标
   * @param indicatorType
   * @param chart
   */
  calcIndicator (indicatorType, chart) {
    Promise.resolve().then(() => {
      try {
        const calc = calcIndicator[indicatorType]
        if (isFunction(calc)) {
          this.dataProvider.dataList = calc(this.dataProvider.dataList)
        }
        this.flushCharts([chart, this.tooltipChart])
      } catch (e) {
      }
    })
  }

  /**
   * 设置参数
   * @param c
   */
  setConfig (c = {}) {
    merge(this.config, c)
    this.calcChartDimensions()
  }

  /**
   * 添加数据集合
   * @param data
   * @param pos
   */
  addData (data, pos = this.dataProvider.dataList.length) {
    this.dataProvider.addData(data, pos)
    this.calcChartIndicator()
    this.xAxisChart.flush()
  }

  /**
   * 设置主图指标
   * @param indicatorType
   */
  setMainIndicatorType (indicatorType) {
    if (this.candleChart.indicatorType !== indicatorType) {
      this.candleChart.indicatorType = indicatorType
      this.calcIndicator(indicatorType, this.candleChart)
    }
  }

  /**
   * 设置副图指标
   * @param indicatorType
   */
  setSubIndicatorType (indicatorType) {
    if (this.subIndicatorChart.indicatorType !== indicatorType) {
      const shouldCalcChartHeight = indicatorType === IndicatorType.NO || this.subIndicatorChart.indicatorType === IndicatorType.NO
      this.subIndicatorChart.indicatorType = indicatorType
      if (shouldCalcChartHeight) {
        this.calcChartDimensions()
      }
      if (indicatorType !== IndicatorType.NO) {
        this.calcIndicator(indicatorType, this.subIndicatorChart)
      }
    }
  }

  /**
   * 显示成交量图
   * @param isShow
   */
  showVolChart (isShow) {
    const isShowVol = this.volIndicatorChart.indicatorType !== IndicatorType.NO
    if (isShow !== isShowVol) {
      this.volIndicatorChart.indicatorType = isShow ? IndicatorType.VOL : IndicatorType.NO
      this.calcChartDimensions()
      if (isShow) {
        this.calcIndicator(IndicatorType.VOL, this.volIndicatorChart)
      }
    }
  }

  /**
   * 设置默认的range
   * @param range
   */
  setDefaultRange (range) {
    if (isNumber(range) && range >= this.dataProvider.minRange && range <= this.dataProvider.maxRange) {
      this.dataProvider.range = range
      this.dataProvider.space(this.tooltipChart.viewPortHandler.contentRight() - this.tooltipChart.viewPortHandler.contentLeft())
      if (this.dataProvider.minPos + range > this.dataProvider.dataList.length) {
        this.dataProvider.minPos = this.dataProvider.dataList.length - range
        if (this.dataProvider.minPos < 0) {
          this.dataProvider.minPos = 0
        }
      }
      this.flushCharts([this.candleChart, this.volIndicatorChart, this.subIndicatorChart, this.xAxisChart])
    }
  }

  /**
   * 设置最小range
   * @param range
   */
  setMinRange (range) {
    if (isNumber(range) && range <= this.dataProvider.range) {
      this.dataProvider.minRange = range
    }
  }

  /**
   * 设置最大range
   * @param range
   */
  setMaxRange (range) {
    if (isNumber(range) && range >= this.dataProvider.range) {
      this.dataProvider.maxRange = range
    }
  }

  /**
   * 获取主图指标类型
   * @returns {string}
   */
  getMainIndicatorType () {
    return this.candleChart.indicatorType
  }

  /**
   * 获取附图指标类型
   * @returns {string}
   */
  getSubIndicatorType () {
    return this.subIndicatorChart.indicatorType
  }

  /**
   * 成交量图是否显示
   * @returns {boolean}
   */
  isShowVolChart () {
    return this.volIndicatorChart.indicatorType !== IndicatorType.NO
  }

  /**
   * 获取数据集合
   * @returns {Array}
   */
  getDataList () {
    return this.dataProvider.dataList
  }

  /**
   * 获取当前配置
   * @returns {{indicator, yAxis, xAxis, grid, candle, tooltip}}
   */
  getConfig () {
    return this.config
  }

  /**
   * 清空数据
   */
  clearData () {
    this.dataProvider.dataList = []
  }

  /**
   * 绘制标记图形
   * @param markerType
   */
  drawMarker (markerType) {
    // 如果当前是正在绘制其它的线模型，则清除掉当前现在绘制的数据
    const currentMarkerType = this.dataProvider.currentMarkerType
    if (currentMarkerType !== markerType) {
      const markerData = this.dataProvider.markerDatas[currentMarkerType]
      if (markerData && isArray(markerData)) {
        markerData.splice(markerData.length - 1, 1)
        this.dataProvider.markerDatas[currentMarkerType] = markerData
        this.tooltipChart.flush()
      }
    }
    this.dataProvider.currentMarkerType = markerType
  }

  /**
   * 清空所有标记图形
   */
  clearAllMarker () {
    const markerDatas = this.dataProvider.markerDatas
    Object.keys(markerDatas).forEach(key => {
      this.dataProvider.markerDatas[key] = []
    })
    this.dataProvider.currentMarkerType = MarkerType.NONE
    this.markerChart.flush()
  }

  /**
   * 获取图表转换为图片后url
   * @param type
   * @param excludes
   */
  getConvertPictureUrl (type = 'jpeg', excludes = []) {
    if (type !== 'png' && type !== 'jpeg' && type !== 'bmp') {
      throw new Error('Picture format only supports jpeg, png and bmp!!!')
    }
    const c = document.createElement('canvas')
    const xAxisCanvas = this.xAxisChart.canvasDom
    const candleCanvas = this.candleChart.canvasDom
    const volCanvas = this.volIndicatorChart.canvasDom
    const indicatorCanvas = this.subIndicatorChart.canvasDom
    const tooltipCanvas = this.tooltipChart.canvasDom
    c.width = tooltipCanvas.width
    c.height = tooltipCanvas.height
    c.style.width = tooltipCanvas.style.width
    c.style.height = tooltipCanvas.style.height
    const ctx = c.getContext('2d')
    ctx.drawImage(xAxisCanvas, 0, 0, xAxisCanvas.width, xAxisCanvas.height)
    if (!excludes || excludes.indexOf('candle') < 0) {
      ctx.drawImage(candleCanvas, 0, 0, candleCanvas.width, candleCanvas.height)
    }
    if (!excludes || excludes.indexOf('vol') < 0) {
      ctx.drawImage(volCanvas, 0, candleCanvas.height, volCanvas.width, volCanvas.height)
    }
    if (!excludes || excludes.indexOf('subIndicator') < 0) {
      ctx.drawImage(indicatorCanvas, 0, candleCanvas.height + volCanvas.height, indicatorCanvas.width, indicatorCanvas.height)
    }
    if (!excludes || excludes.indexOf('marker') < 0) {
      const markerCanvas = this.markerChart.canvasDom
      ctx.drawImage(markerCanvas, 0, 0, markerCanvas.width, markerCanvas.height)
    }
    if (!excludes || excludes.indexOf('tooltip') < 0) {
      ctx.drawImage(tooltipCanvas, 0, 0, tooltipCanvas.width, tooltipCanvas.height)
    }
    return c.toDataURL(`image/${type}`)
  }
}

export default RootChart