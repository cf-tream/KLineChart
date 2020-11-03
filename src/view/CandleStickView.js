/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import TechnicalIndicatorView from './TechnicalIndicatorView'
import { LineStyle, ChartType } from '../data/options/styleOptions'
import { drawHorizontalLine, drawVerticalLine, getFont, drawLine } from '../utils/canvas'
import { formatPrecision, formatValue } from '../utils/format'
import { IogoData,labeledLine,masterMapHeightAlter,masterMapHeight } from '../data/ChartData'
var imgObj=new Image();
var imgObjLoad = true;
export default class CandleStickView extends TechnicalIndicatorView {
  _draw () {
    this._drawGrid()
    this._drawIogoData()
    if (this._additionalDataProvider.chartType() === ChartType.REAL_TIME) {
      this._drawRealTime()
    } else {
      this._drawCandleStick()
      this._drawTechnicalIndicator()
      this._drawHighestPriceMark()
      this._drawLowestPriceMark()
    }
    this._drawLastPriceLine()
    this._theHorizontalAxisPrompt();
    this._theHorizontalTooltip();
  }
  
  /**
   * 绘制分时图
   * @private
   */
  _drawRealTime () {
    const timeLinePoints = []
    const timeLineAreaPoints = []
    const averageLinePoints = []
    const from = this._chartData.from()
    const technicalIndicator = this._additionalDataProvider.technicalIndicator()
    const technicalIndicatorResult = technicalIndicator.result
    const onDrawing = (x, i, kLineData, halfBarSpace) => {
      const technicalIndicatorData = technicalIndicatorResult[i] || {}
      const average = technicalIndicatorData.average || 0
      const closeY = this._yAxis.convertToPixel(kLineData.close)
      const averageY = this._yAxis.convertToPixel(average)
      averageLinePoints.push({ x: x, y: averageY })
      if (i === from) {
        const startX = x - halfBarSpace
        timeLineAreaPoints.push({ x: startX, y: this._height })
        timeLineAreaPoints.push({ x: startX, y: closeY })
        timeLinePoints.push({ x: startX, y: closeY })
      }
      timeLinePoints.push({ x: x, y: closeY })
      timeLineAreaPoints.push({ x: x, y: closeY })
    }
    const onDrawEnd = () => {
      const areaPointLength = timeLineAreaPoints.length
      if (areaPointLength > 0) {
        const lastPoint = timeLineAreaPoints[areaPointLength - 1]
        const halfBarSpace = this._chartData.barSpace() / 2
        const endX = lastPoint.x + halfBarSpace
        timeLinePoints.push({ x: endX, y: lastPoint.y })
        timeLineAreaPoints.push({ x: endX, y: lastPoint.y })
        timeLineAreaPoints.push({ x: endX, y: this._height })
      }

      const realTime = this._chartData.styleOptions().realTime
      const timeLine = realTime.timeLine
      if (timeLinePoints.length > 0) {
        // 绘制分时线
        this._ctx.lineWidth = timeLine.size
        this._ctx.strokeStyle = timeLine.color
        drawLine(this._ctx, () => {
          this._ctx.beginPath()
          this._ctx.moveTo(timeLinePoints[0].x, timeLinePoints[0].y)
          for (let i = 1; i < timeLinePoints.length; i++) {
            this._ctx.lineTo(timeLinePoints[i].x, timeLinePoints[i].y)
          }
          this._ctx.stroke()
          this._ctx.closePath()
        })
      }

      if (timeLineAreaPoints.length > 0) {
        // 绘制分时线填充区域
        this._ctx.fillStyle = timeLine.areaFillColor
        this._ctx.beginPath()
        this._ctx.moveTo(timeLineAreaPoints[0].x, timeLineAreaPoints[0].y)
        for (let i = 1; i < timeLineAreaPoints.length; i++) {
          this._ctx.lineTo(timeLineAreaPoints[i].x, timeLineAreaPoints[i].y)
        }
        this._ctx.closePath()
        this._ctx.fill()
      }
      const averageLine = realTime.averageLine
      if (averageLine.display && averageLinePoints.length > 0) {
        // 绘制均线
        this._ctx.lineWidth = averageLine.size
        this._ctx.strokeStyle = averageLine.color
        drawLine(this._ctx, () => {
          this._ctx.beginPath()
          this._ctx.moveTo(averageLinePoints[0].x, averageLinePoints[0].y)
          for (let i = 1; i < averageLinePoints.length; i++) {
            this._ctx.lineTo(averageLinePoints[i].x, averageLinePoints[i].y)
          }
          this._ctx.stroke()
          this._ctx.closePath()
        })
      }
    }
    this._drawGraphics(onDrawing, onDrawEnd)
  }

  /**
   * 绘制蜡烛
   * @private
   */
  _drawCandleStick () {
    
    const candleStickOptions = this._chartData.styleOptions().candleStick
    this._drawGraphics((x, i, kLineData, halfBarSpace, barSpace) => {
      this._drawCandleStickBar(x, halfBarSpace, barSpace, kLineData, candleStickOptions.bar, candleStickOptions.bar.style)
    })
  }

    /**
   * 绘制图片logo
   * @private
   */
  _drawIogoData () {
    if(IogoData && IogoData.imgUrl && IogoData.imgUrl!=''){
      let _this = this;
      if(!imgObjLoad && imgObj.src){
        _this._ctx.globalAlpha= IogoData.opacity;
        _this._ctx.drawImage(imgObj, (parseFloat(_this._ctx.canvas.style.width)-IogoData.width)*IogoData.x, (parseFloat(_this._ctx.canvas.style.height)-IogoData.height)*IogoData.y,IogoData.width,IogoData.height);
        _this._ctx.globalAlpha=1;
      } else {
        imgObj.src = IogoData.imgUrl;
        imgObj.onload = function(){
          _this._ctx.globalAlpha= IogoData.opacity;
          _this._ctx.drawImage(imgObj, (parseFloat(_this._ctx.canvas.style.width)-IogoData.width)*IogoData.x, (parseFloat(_this._ctx.canvas.style.height)-IogoData.height)*IogoData.y,IogoData.width,IogoData.height);
          _this._ctx.globalAlpha=1;
          imgObjLoad=false;
        }
      }
    }
  }

  /**
   * 渲染最高价标记
   */
  _drawHighestPriceMark () {
    const priceMarkOptions = this._chartData.styleOptions().candleStick.priceMark
    const highestPriceMarkOptions = priceMarkOptions.high
    if (!priceMarkOptions.display || !highestPriceMarkOptions.display) {
      return
    }
    const dataList = this._chartData.dataList()
    const to = this._chartData.to()
    let highestPrice = -Infinity
    let highestPos = -1
    for (let i = this._chartData.from(); i < to; i++) {
      const high = formatValue(dataList[i], 'high', -Infinity)
      if (high > highestPrice) {
        highestPrice = high
        highestPos = i
      }
    }
    if (highestPrice !== -Infinity) {
      this._drawLowestHighestPriceMark(highestPriceMarkOptions, highestPos, highestPrice, true)
    }
  }

  /**
   * 绘制最低价标记
   */
  _drawLowestPriceMark () {
    const priceMarkOptions = this._chartData.styleOptions().candleStick.priceMark
    const lowestPriceMarkOptions = priceMarkOptions.low
    if (!priceMarkOptions.display || !lowestPriceMarkOptions.display) {
      return
    }
    const dataList = this._chartData.dataList()
    const to = this._chartData.to()
    let lowestPrice = Infinity
    let lowestPos = -1
    for (let i = this._chartData.from(); i < to; i++) {
      const low = formatValue(dataList[i], 'low', Infinity)
      if (low < lowestPrice) {
        lowestPrice = low
        lowestPos = i
      }
    }
    if (lowestPrice !== Infinity) {
      this._drawLowestHighestPriceMark(lowestPriceMarkOptions, lowestPos, lowestPrice)
    }
  }

  /**
   * 渲染最高最低价格标记
   * @param priceMarkOptions
   * @param pricePos
   * @param price
   * @param isHigh
   */
  _drawLowestHighestPriceMark (priceMarkOptions, pricePos, price, isHigh) {
    const pricePrecision = this._chartData.pricePrecision()
    const priceY = this._yAxis.convertToPixel(price)
    const startX = this._xAxis.convertToPixel(pricePos)
    const startY = priceY + (isHigh ? -2 : 2)
    this._ctx.textAlign = 'left'
    this._ctx.lineWidth = 1
    this._ctx.strokeStyle = priceMarkOptions.color
    this._ctx.fillStyle = priceMarkOptions.color

    drawLine(this._ctx, () => {
      this._ctx.beginPath()
      this._ctx.moveTo(startX, startY)
      this._ctx.lineTo(startX - 2, startY + (isHigh ? -2 : 2))
      this._ctx.stroke()
      this._ctx.closePath()

      this._ctx.beginPath()
      this._ctx.moveTo(startX, startY)
      this._ctx.lineTo(startX + 2, startY + (isHigh ? -2 : 2))
      this._ctx.stroke()
      this._ctx.closePath()
    })

    // 绘制竖线
    const y = startY + (isHigh ? -5 : 5)
    drawVerticalLine(this._ctx, startX, startY, y)
    drawHorizontalLine(this._ctx, y, startX, startX + 5)

    this._ctx.font = getFont(priceMarkOptions.textSize, priceMarkOptions.textWeight, priceMarkOptions.textFamily)
    const text = formatPrecision(price, pricePrecision)
    this._ctx.textBaseline = 'middle'
    this._ctx.fillText(text, startX + 5 + priceMarkOptions.textMargin, y)
  }

  /**
   * 绘制最新价线 a
   * @private
   */
  _drawLastPriceLine () {
    const dataList = this._chartData.dataList()
    const dataSize = dataList.length
    const priceMark = this._chartData.styleOptions().candleStick.priceMark
    const lastPriceMark = priceMark.last
    if (!priceMark.display || !lastPriceMark.display || !lastPriceMark.line.display || dataSize === 0) {
      return
    }
    const kLineData = dataList[dataSize - 1]
    const close = kLineData.close
    const open = kLineData.open
    let priceY = this._yAxis.convertToPixel(close)
    priceY = +(Math.max(this._height * 0.05, Math.min(priceY, this._height * 0.98))).toFixed(0)
    let color
    if (close > open) {
      color = lastPriceMark.upColor
    } else if (close < open) {
      color = lastPriceMark.downColor
    } else {
      color = lastPriceMark.noChangeColor
    }
    const priceMarkLine = lastPriceMark.line
    this._ctx.save()
    this._ctx.strokeStyle = color
    this._ctx.lineWidth = priceMarkLine.size
    if (priceMarkLine.style === LineStyle.DASH) {
      this._ctx.setLineDash(priceMarkLine.dashValue)
    }
    drawHorizontalLine(this._ctx, priceY, 0, this._width)
    this._ctx.restore()
  }

  /**
   * 绘制标记线
   * @private
   */
  _theHorizontalAxisPrompt () {
    masterMapHeightAlter(this._ctx.canvas.height);
    if(labeledLine && labeledLine.length && labeledLine.length>=1){
      labeledLine.forEach(item=>{
        let close = item.value;
        let priceY = this._yAxis.convertToPixel(close)
        // priceY = +(Math.max(this._height * 0.05, Math.min(priceY, this._height * 0.98))).toFixed(0)
        if(priceY>0 && priceY<masterMapHeight){
          let priceMarkLine = item.lineStyle;
          this._ctx.save()
          this._ctx.strokeStyle = item.lineStyle.color;
          this._ctx.lineWidth = priceMarkLine.size
          if (priceMarkLine.style === LineStyle.DASH) {
            this._ctx.setLineDash(priceMarkLine.dashValue)
          }
          drawHorizontalLine(this._ctx, priceY, 0, this._width)
          this._ctx.restore()
        }
      })
    }
  }

   /**
   * 绘制提示框
   * labeledLine
   */
  _theHorizontalTooltip () {
    if(masterMapHeight==this._ctx.canvas.height){
      this._chartData.storeYAxis(this._yAxis);
      labeledLine.forEach(data=>{
        // 提示框的宽度
        let w = data.boxStyle.width;
        // 提示框的高度======》画布高度-下放三角箭头的高度
        let h = data.boxStyle.height;

        let close = data.value;
        let priceY = this._yAxis.convertToPixel(close)
        // priceY = +(Math.max(this._height * 0.05, Math.min(priceY, this._height * 0.98))).toFixed(0);
        if(priceY>0 && priceY<masterMapHeight){
          // 定义canvas画笔的x坐标点
          let x = data.shaftX;
          // 定义canvas画笔的y坐标点
          let y = priceY - h / 2;
          // 定义圆角的半径
          let r = data.boxStyle.borderRadius;
          // 缩放
          this._ctx.scale(1, 1);
          
          // 开始
          this._ctx.beginPath();
          this._ctx.moveTo(x+r, y);
          this._ctx.arcTo(x+w, y, x+w, y+h, r);
          this._ctx.arcTo(x+w, y+h, x, y+h, r);
          this._ctx.arcTo(x, y+h, x, y, r);
          this._ctx.arcTo(x, y, x+w, y, r);
          this._ctx.stroke();
          
          // 设置阴影
          this._ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'; // 颜色
          this._ctx.shadowBlur = 5; // 模糊尺寸
          this._ctx.shadowOffsetX = 2; // 阴影Y轴偏移
          this._ctx.shadowOffsetY = 2; // 阴影X轴偏移
          // 文字提示框的颜色
          this._ctx.strokeStyle=data.boxStyle.borderColor;
          this._ctx.lineWidth=data.boxStyle.borderLine;
          //沿着坐标点顺序的路径绘制直线
          this._ctx.stroke();
          // 关闭,形成一个闭合的回路---->轮廓
          this._ctx.closePath();
          // 填充
          // this._ctx.fill();

          let useX = x;
          
          data.boxStyle.item.forEach(item=>{
            if(item.type=="text"){
              this._ctx.fillStyle=item.background;
              this._ctx.fillRect(useX,y,item.width,item.height); 
              this._ctx.fill();
              this._ctx.closePath();
              //开始一个新的绘制路径
              this._ctx.beginPath();
              this._ctx.strokeStyle=item.borderColor;
              this._ctx.lineWidth=item.borderLine;
              this._ctx.moveTo(useX, y);
              this._ctx.lineTo(useX, y+item.height);
              this._ctx.font = item.font;
              this._ctx.fillStyle = item.color;
              this._ctx.fillText(item.text,useX+item.textOffsetLeft,y+item.textOffsetTop,item.width);
              //沿着坐标点顺序的路径绘制直线
              this._ctx.stroke();
              //关闭当前的绘制路径
              this._ctx.closePath();
            }else if(item.type=="img"){
              this._ctx.fillRect(useX,y,item.width,item.height); 
              this._ctx.fillStyle=item.background;
              this._ctx.fill();
              this._ctx.closePath();
              //开始一个新的绘制路径
              this._ctx.beginPath();
              this._ctx.strokeStyle=item.borderColor;
              this._ctx.lineWidth=item.borderLine;
              this._ctx.moveTo(useX, y);
              this._ctx.lineTo(useX, y+item.height);
              //沿着坐标点顺序的路径绘制直线
              this._ctx.stroke();
              let imgObj= new Image();
              imgObj.src = item.url;
              if(imgObj.src!=''){
                this._ctx.drawImage(imgObj, useX + item.textOffsetLeft,  y + item.textOffsetTop ,item.imgWidth,item.imgHeight);
              }
              //关闭当前的绘制路径
              this._ctx.closePath();
            }
            useX+=item.width;
          })
        }
      })
    }
  }

}
