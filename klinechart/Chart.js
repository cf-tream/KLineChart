import ChartSeries, { CANDLE_STICK_SERIES_TAG } from './series/ChartSeries'
import { isArray } from './utils/typeChecks'
import { GraphicMarkType } from './data/ChartData'

export default class Chart {
  constructor (container, styleOptions) {
    this._chartSeries = new ChartSeries(container, styleOptions)
  }

  /**
   * 加载样式配置
   * @param options
   */
  applyStyleOptions (options) {
    this._chartSeries.applyStyleOptions(options)
  }

  /**
   * 获取样式配置
   * @returns {[]|*[]}
   */
  getStyleOptions () {
    return this._chartSeries.chartData().styleOptions()
  }

  /**
   * 加载技术指标参数
   * @param technicalIndicatorType
   * @param params
   */
  applyTechnicalIndicatorParams (technicalIndicatorType, params) {
    this._chartSeries.applyTechnicalIndicatorParams(technicalIndicatorType, params)
  }

  /**
   * 加载精度
   * @param pricePrecision
   * @param volumePrecision
   */
  applyPrecision (pricePrecision, volumePrecision) {
    this._chartSeries.chartData().applyPrecision(pricePrecision, volumePrecision)
  }

  /**
   * 重置尺寸，总是会填充父容器
   */
  resize () {
    this._chartSeries.chartData().adjustFromTo()
    this._chartSeries.measureSeriesSize()
  }

  /**
   * 设置右边间距
   * @param space
   */
  setOffsetRightSpace (space) {
    this._chartSeries.chartData().setOffsetRightSpace(space)
  }

  /**
   * 设置柱子的空间
   * @param space
   */
  setBarSpace (space) {
    this._chartSeries.chartData().setDataSpace(space)
  }

  /**
   * 清空数据
   */
  clearData () {
    this._chartSeries.chartData().clearDataList()
  }

  /**
   * 获取数据源
   */
  getDataList () {
    this._chartSeries.chartData().dataList()
  }

  /**
   * 添加新数据
   * @param dataList
   * @param more
   */
  applyNewData (dataList, more) {
    this._chartSeries.applyNewData(dataList, more)
  }

  /**
   * 添加历史更多数据
   * @param dataList
   * @param more
   */
  applyMoreData (dataList, more) {
    this._chartSeries.applyMoreData(dataList, more)
  }

  /**
   * 更新数据
   * @param data
   */
  updateData (data) {
    this._chartSeries.updateData(data)
  }

  /**
   * 设置蜡烛图表类型
   * @param type
   */
  setCandleStickChartType (type) {
    this._chartSeries.setCandleStickSeriesType(type)
  }

  /**
   * 设置蜡烛图技术指标类型
   * @param technicalIndicatorType
   */
  setCandleStickTechnicalIndicatorType (technicalIndicatorType) {
    this._chartSeries.setTechnicalIndicatorType(CANDLE_STICK_SERIES_TAG, technicalIndicatorType)
  }

  /**
   * 设置技术指标类型
   * @param tag
   * @param technicalIndicatorType
   */
  setTechnicalIndicatorType (tag, technicalIndicatorType) {
    this._chartSeries.setTechnicalIndicatorType(tag, technicalIndicatorType)
  }

  /**
   * 添加一个技术指标
   * @param technicalIndicatorType
   * @param height
   * @returns {string}
   */
  addTechnicalIndicator (technicalIndicatorType, height) {
    return this._chartSeries.createTechnicalIndicator(technicalIndicatorType, height)
  }

  /**
   * 移除一个技术指标
   * @param tag
   */
  removeTechnicalIndicator (tag) {
    this._chartSeries.removeTechnicalIndicator(tag)
  }

  /**
   * 添加图形标记
   * @param type
   */
  addGraphicMark (type) {
    const graphicMarkType = this._chartSeries.chartData().graphicMarkType()
    if (graphicMarkType !== type) {
      const graphicMarkDatas = this._chartSeries.chartData().graphicMarkData()
      const graphicMarkData = graphicMarkDatas[graphicMarkType]
      if (graphicMarkData && isArray(graphicMarkData)) {
        graphicMarkData.splice(graphicMarkData.length - 1, 1)
        graphicMarkDatas[graphicMarkType] = graphicMarkData
      } else {
        type = GraphicMarkType.NONE
      }
      this._chartSeries.chartData().setGraphicMarkType(type)
      this._chartSeries.chartData().setGraphicMarkData(graphicMarkDatas)
    }
  }

  /**
   * 移除所有标记图形
   */
  removeAllGraphicMark () {
    const graphicMarkDatas = this._chartSeries.chartData().graphicMarkData()
    const newGraphicMarkDatas = {}
    Object.keys(graphicMarkDatas).forEach(key => {
      newGraphicMarkDatas[key] = []
    })
    this._chartSeries.chartData().setGraphicMarkType(GraphicMarkType.NONE)
    this._chartSeries.chartData().setGraphicMarkData(newGraphicMarkDatas)
  }
}