import IndicatorRender from './IndicatorRender'
import { calcTextWidth } from '../internal/utils/drawUtils'
import { formatDecimal, isFunction } from '../internal/utils/dataUtils'
import { CandleStyle, LineStyle } from '../internal/constants'

class CandleRender extends IndicatorRender {
  /**
   * 渲染蜡烛图
   * @param ctx
   * @param candle
   */
  renderCandle (ctx, candle) {
    ctx.lineWidth = 1
    let rect = []
    let markHighestPrice = Number.MIN_SAFE_INTEGER
    let markHighestPriceX = -1
    let markLowestPrice = Number.MAX_SAFE_INTEGER
    let markLowestPriceX = -1
    const dataList = this.dataProvider.dataList
    const onRendering = (x, i, kLineData, halfBarSpace) => {
      const refKLineData = dataList[i - 1] || {}
      const refClose = refKLineData.close || Number.MIN_SAFE_INTEGER
      const high = kLineData.high
      const low = kLineData.low
      const close = kLineData.close
      const open = kLineData.open
      if (markHighestPrice < high) {
        markHighestPrice = high
        markHighestPriceX = x
      }

      if (low < markLowestPrice) {
        markLowestPrice = low
        markLowestPriceX = x
      }
      if (close > refClose) {
        ctx.strokeStyle = candle.candleChart.increasingColor
        ctx.fillStyle = candle.candleChart.increasingColor
      } else {
        ctx.strokeStyle = candle.candleChart.decreasingColor
        ctx.fillStyle = candle.candleChart.decreasingColor
      }

      if (candle.candleChart.candleStyle !== CandleStyle.OHLC) {
        const openY = this.yAxisRender.getY(open)
        const closeY = this.yAxisRender.getY(close)
        const highY = this.yAxisRender.getY(high)
        const lowY = this.yAxisRender.getY(low)
        const highLine = []
        const lowLine = []
        highLine[0] = highY
        lowLine[1] = lowY
        if (openY > closeY) {
          highLine[1] = closeY
          lowLine[0] = openY
          rect = [x - halfBarSpace, closeY, halfBarSpace * 2, openY - closeY]
        } else if (openY < closeY) {
          highLine[1] = openY
          lowLine[0] = closeY
          rect = [x - halfBarSpace, openY, halfBarSpace * 2, closeY - openY]
        } else {
          highLine[1] = openY
          lowLine[0] = closeY
          rect = [x - halfBarSpace, openY, halfBarSpace * 2, 1]
        }
        ctx.beginPath()
        ctx.moveTo(x, highLine[0])
        ctx.lineTo(x, highLine[1])
        ctx.stroke()
        ctx.closePath()

        ctx.beginPath()
        ctx.moveTo(x, lowLine[0])
        ctx.lineTo(x, lowLine[1])
        ctx.stroke()
        ctx.closePath()
        if (rect[3] < 1) {
          rect[3] = 1
        }
        switch (candle.candleChart.candleStyle) {
          case CandleStyle.SOLID: {
            ctx.fillRect(rect[0], rect[1], rect[2], rect[3])
            break
          }
          case CandleStyle.STROKE: {
            ctx.strokeRect(rect[0], rect[1], rect[2], rect[3])
            break
          }
          case CandleStyle.INCREASING_STROKE: {
            if (close > refClose) {
              ctx.strokeRect(rect[0], rect[1], rect[2], rect[3])
            } else {
              ctx.fillRect(rect[0], rect[1], rect[2], rect[3])
            }
            break
          }
          case CandleStyle.DECREASING_STROKE: {
            if (close > refClose) {
              ctx.fillRect(rect[0], rect[1], rect[2], rect[3])
            } else {
              ctx.strokeRect(rect[0], rect[1], rect[2], rect[3])
            }
            break
          }
        }
      } else {
        this.renderOhlc(
          ctx, halfBarSpace, x, kLineData,
          refKLineData, candle.candleChart.increasingColor, candle.candleChart.decreasingColor
        )
      }
    }
    this.renderGraphics(ctx, onRendering)
    this.highestMarkData = { x: markHighestPriceX, price: markHighestPrice }
    this.lowestMarkData = { x: markLowestPriceX, price: markLowestPrice }
  }

  /**
   * 渲染最高价标记
   * @param ctx
   * @param candle
   */
  renderHighestPriceMark (ctx, candle) {
    const highestPriceMark = candle.candleChart.highestPriceMark
    const price = this.highestMarkData.price
    if (price === Number.MIN_SAFE_INTEGER || !highestPriceMark.display) {
      return
    }
    this.renderLowestHighestPriceMark(
      ctx, highestPriceMark, this.highestMarkData.x, price, true
    )
  }

  /**
   * 绘制最低价标记
   * @param ctx
   * @param candle
   */
  renderLowestPriceMark (ctx, candle) {
    const lowestPriceMark = candle.candleChart.lowestPriceMark
    const price = this.lowestMarkData.price
    if (price === Number.MAX_SAFE_INTEGER || !lowestPriceMark.display) {
      return
    }
    this.renderLowestHighestPriceMark(
      ctx, lowestPriceMark, this.lowestMarkData.x, price
    )
  }

  /**
   * 渲染最高最低价格标记
   * @param ctx
   * @param priceMark
   * @param x
   * @param price
   * @param isHigh
   */
  renderLowestHighestPriceMark (ctx, priceMark, x, price, isHigh = false) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(
      0, 0,
      this.viewPortHandler.contentRight() - this.viewPortHandler.contentLeft(),
      this.viewPortHandler.contentBottom() - this.viewPortHandler.contentTop()
    )
    ctx.closePath()
    ctx.clip()
    const priceY = this.yAxisRender.getY(price)
    const startX = x
    let startY = priceY + (isHigh ? -2 : 2)
    ctx.textAlign = 'left'
    ctx.lineWidth = 1
    ctx.strokeStyle = priceMark.color
    ctx.fillStyle = priceMark.color
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(startX - 2, startY + (isHigh ? -2 : 2))
    ctx.stroke()
    ctx.closePath()

    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(startX + 2, startY + (isHigh ? -2 : 2))
    ctx.stroke()
    ctx.closePath()
    // 绘制竖线
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    startY = startY + (isHigh ? -5 : 5)
    ctx.lineTo(startX, startY)
    ctx.stroke()
    ctx.closePath()

    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(startX + 5, startY)
    ctx.stroke()
    ctx.closePath()

    const textSize = priceMark.text.size
    const valueFormatter = priceMark.text.valueFormatter
    ctx.font = `${textSize}px Arial`
    let value = price.toFixed(2)
    if (valueFormatter) {
      value = valueFormatter(price) + ''
    }
    ctx.textBaseline = 'middle'
    ctx.fillText(value, startX + 5 + priceMark.text.margin, startY)
    ctx.restore()
  }

  /**
   * 绘制最新价标记
   * @param ctx
   * @param candle
   * @param isRenderTextLeft
   * @param isRenderTextOutside
   */
  renderLastPriceMark (ctx, candle, isRenderTextLeft, isRenderTextOutside) {
    const lastPriceMark = candle.lastPriceMark
    const dataSize = this.dataProvider.dataList.length
    if (!lastPriceMark.display || dataSize === 0) {
      return
    }
    const preKLineData = this.dataProvider.dataList[dataSize - 2] || {}
    const preLastPrice = preKLineData.close || Number.MIN_SAFE_INTEGER
    const lastPrice = this.dataProvider.dataList[dataSize - 1].close
    let priceY = this.yAxisRender.getY(lastPrice)
    const height = this.viewPortHandler.contentBottom() - this.viewPortHandler.contentTop()
    priceY = +(Math.max(height * 0.05, Math.min(priceY, height * 0.98))).toFixed(0)
    const color = lastPrice > preLastPrice ? lastPriceMark.increasingColor : lastPriceMark.decreasingColor
    let lineStartX = this.viewPortHandler.contentLeft()
    let lineEndX = this.viewPortHandler.contentRight()
    const priceMarkText = lastPriceMark.text
    const displayText = priceMarkText.display
    if (displayText) {
      let text = formatDecimal(lastPrice)
      const valueFormatter = priceMarkText.valueFormatter
      if (isFunction(valueFormatter)) {
        text = valueFormatter(lastPrice) || '--'
      }
      const textSize = lastPriceMark.text.size
      const rectWidth = calcTextWidth(textSize, text) + priceMarkText.paddingLeft + priceMarkText.paddingRight
      const rectHeight = priceMarkText.paddingTop + textSize + priceMarkText.paddingBottom
      let rectStartX
      if (isRenderTextOutside) {
        if (isRenderTextLeft) {
          rectStartX = lineStartX - rectWidth
        } else {
          rectStartX = lineEndX
        }
      } else {
        if (isRenderTextLeft) {
          rectStartX = lineStartX
          lineStartX += rectWidth
        } else {
          rectStartX = lineEndX - rectWidth
          lineEndX = rectStartX
        }
      }
      ctx.fillStyle = color
      ctx.fillRect(rectStartX, priceY - priceMarkText.paddingTop - textSize / 2, rectWidth, rectHeight)
      ctx.fillStyle = priceMarkText.color
      ctx.font = `${textSize}px Arial`
      ctx.textBaseline = 'middle'
      ctx.fillText(text, rectStartX + priceMarkText.paddingLeft, priceY)
    }
    const priceMarkLine = lastPriceMark.line
    if (priceMarkLine.display) {
      ctx.strokeStyle = color
      ctx.lineWidth = priceMarkLine.size
      if (priceMarkLine.style === LineStyle.DASH) {
        ctx.setLineDash(priceMarkLine.dashValue)
      }
      ctx.beginPath()
      ctx.moveTo(lineStartX, priceY)
      ctx.lineTo(lineEndX, priceY)
      ctx.stroke()
      ctx.closePath()
      ctx.setLineDash([])
    }
  }

  /**
   * 绘制分时线
   * @param ctx
   * @param candle
   */
  renderTimeLine (ctx, candle) {
    const timeLinePoints = []
    const timeLineAreaPoints = [{ x: this.viewPortHandler.contentLeft(), y: this.viewPortHandler.contentBottom() }]
    const averageLinePoints = []

    const minPos = this.dataProvider.minPos
    const range = this.dataProvider.range
    const dataSize = this.dataProvider.dataList.length
    const onRendering = (x, i, kLineData) => {
      const average = kLineData.average
      const closeY = this.yAxisRender.getY(kLineData.close)
      const averageY = this.yAxisRender.getY(average)
      timeLinePoints.push({ x: x, y: closeY })
      if (average || average === 0) {
        averageLinePoints.push({ x: x, y: averageY })
      }
      if (i === minPos) {
        timeLineAreaPoints.push({ x: this.viewPortHandler.contentLeft(), y: closeY })
        timeLineAreaPoints.push({ x: x, y: closeY })
      } else if (i === minPos + range - 1) {
        timeLineAreaPoints.push({ x: x, y: closeY })
        timeLineAreaPoints.push({ x: this.viewPortHandler.contentRight(), y: closeY })
        timeLineAreaPoints.push({ x: this.viewPortHandler.contentRight(), y: this.viewPortHandler.contentBottom() })
      } else if (i === dataSize - 1) {
        timeLineAreaPoints.push({ x: x, y: closeY })
        timeLineAreaPoints.push({ x: x, y: this.viewPortHandler.contentBottom() })
      } else {
        timeLineAreaPoints.push({ x: x, y: closeY })
      }
    }
    const onRenderEnd = () => {
      const timeLine = candle.timeChart.timeLine
      if (timeLinePoints.length > 0) {
        // 绘制分时线
        ctx.lineWidth = timeLine.size
        ctx.strokeStyle = timeLine.color
        ctx.beginPath()
        ctx.moveTo(timeLinePoints[0].x, timeLinePoints[0].y)
        for (let i = 1; i < timeLinePoints.length; i++) {
          ctx.lineTo(timeLinePoints[i].x, timeLinePoints[i].y)
        }
        ctx.stroke()
        ctx.closePath()
      }

      if (timeLineAreaPoints.length > 0) {
        // 绘制分时线填充区域
        ctx.fillStyle = timeLine.areaFillColor
        ctx.beginPath()
        ctx.moveTo(timeLineAreaPoints[0].x, timeLineAreaPoints[0].y)
        for (let i = 1; i < timeLineAreaPoints.length; i++) {
          ctx.lineTo(timeLineAreaPoints[i].x, timeLineAreaPoints[i].y)
        }
        ctx.closePath()
        ctx.fill()
      }
      const averageLine = candle.timeChart.averageLine
      if (averageLine.display && averageLinePoints.length > 0) {
        // 绘制均线
        ctx.lineWidth = averageLine.size
        ctx.strokeStyle = averageLine.color
        ctx.beginPath()
        ctx.moveTo(averageLinePoints[0].x, averageLinePoints[0].y)
        for (let i = 1; i < averageLinePoints.length; i++) {
          ctx.lineTo(averageLinePoints[i].x, averageLinePoints[i].y)
        }
        ctx.stroke()
        ctx.closePath()
      }
    }
    this.renderGraphics(ctx, onRendering, onRenderEnd)
  }
}

export default CandleRender