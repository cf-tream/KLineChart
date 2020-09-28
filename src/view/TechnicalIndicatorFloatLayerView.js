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

import View, { PlotType } from './View'
import { FloatLayerPromptDisplayRule, LineStyle } from '../data/options/styleOptions'
import { isValid } from '../utils/typeChecks'
import { calcTextWidth, drawHorizontalLine, drawVerticalLine, getFont } from '../utils/canvas'
import { getTechnicalIndicatorInfo } from '../data/technicalindicator/technicalIndicatorControl'
import { labeledLineMatching,labeledLineMatchingData,labeledLineHoldXY } from '../data/ChartData'

export default class TechnicalIndicatorFloatLayerView extends View {
  constructor (container, chartData, xAxis, yAxis, additionalDataProvider) {
    super(container, chartData)
    this._xAxis = xAxis
    this._yAxis = yAxis
    this._additionalDataProvider = additionalDataProvider
  }

  _draw () {
    const crossHair = this._chartData.crossHair()
    const dataList = this._chartData.dataList()
    const technicalIndicator = this._additionalDataProvider.technicalIndicator()
    const technicalIndicatorResult = technicalIndicator.result
    let realDataPos
    if (isValid(crossHair.x)) {
      realDataPos = this._xAxis.convertFromPixel(crossHair.x)
    } else {
      realDataPos = dataList.length - 1
    }
    let dataPos = realDataPos
    if (dataPos < 0) {
      dataPos = 0
    } else if (dataPos > dataList.length - 1) {
      dataPos = dataList.length - 1
    }
    const kLineData = dataList[dataPos]
    const technicalIndicatorData = technicalIndicatorResult[dataPos]
    if (kLineData) {
      const realDataPosX = this._xAxis.convertToPixel(realDataPos)
      this._drawCrossHairHorizontalLine(crossHair)
      this._drawCrossHairVerticalLine(crossHair, realDataPosX)
      this._theHorizontalTooltip(crossHair)
      const displayRule = this._chartData.styleOptions().floatLayer.prompt.displayRule
      if (displayRule === FloatLayerPromptDisplayRule.ALWAYS ||
        (displayRule === FloatLayerPromptDisplayRule.FOLLOW_CROSS && crossHair.paneTag)) {
        this._drawPrompt(
          kLineData, technicalIndicatorData,
          realDataPos, realDataPosX, technicalIndicator,
          realDataPos >= 0 && realDataPos <= dataList.length - 1 && crossHair.paneTag
        )
      }
    }
  }

  /**
   * 绘制提示
   * @param kLineData
   * @param technicalIndicatorData
   * @param realDataPos
   * @param realDataPosX
   * @param technicalIndicator
   * @private
   */
  _drawPrompt (
    kLineData, technicalIndicatorData,
    realDataPos, realDataPosX, technicalIndicator
  ) {
    this._drawTechnicalIndicatorPromptText(
      technicalIndicatorData, realDataPos, technicalIndicator
    )
  }

  /**
   * 绘制十字光标水平线
   * @param crossHair
   * @private
   */
  _drawCrossHairHorizontalLine (crossHair) {
    if (crossHair.paneTag !== this._additionalDataProvider.tag()) {
      return
    }
    const crossHairOptions = this._chartData.styleOptions().floatLayer.crossHair
    const crossHairHorizontal = crossHairOptions.horizontal
    const crossHairHorizontalLine = crossHairHorizontal.line
    if (!crossHairOptions.display || !crossHairHorizontal.display || !crossHairHorizontalLine.display) {
      return
    }
    this._ctx.save()
    // 绘制十字光标水平线
    this._ctx.lineWidth = crossHairHorizontalLine.size
    this._ctx.strokeStyle = crossHairHorizontalLine.color
    if (crossHairHorizontalLine.style === LineStyle.DASH) {
      this._ctx.setLineDash(crossHairHorizontalLine.dashValue)
    }
    drawHorizontalLine(this._ctx, crossHair.y, 0, this._width)
    this._ctx.restore()
  }

  /**
   * 绘制十字光标垂直线
   * @param crossHair
   * @param realDataPosX
   * @private
   */
  _drawCrossHairVerticalLine (crossHair, realDataPosX) {
    if (!crossHair.paneTag) {
      return
    }
    const crossHairOptions = this._chartData.styleOptions().floatLayer.crossHair
    const crossHairVertical = crossHairOptions.vertical
    const crossHairVerticalLine = crossHairVertical.line
    if (!crossHairOptions.display || !crossHairVertical.display || !crossHairVerticalLine.display) {
      return
    }
    this._ctx.save()
    this._ctx.lineWidth = crossHairVerticalLine.size
    this._ctx.strokeStyle = crossHairVerticalLine.color

    if (crossHairVerticalLine.style === LineStyle.DASH) {
      this._ctx.setLineDash(crossHairVerticalLine.dashValue)
    }
    drawVerticalLine(this._ctx, realDataPosX, 0, this._height)
    this._ctx.restore()
  }

  /**
   * 绘制指标提示文字
   * @param technicalIndicatorData
   * @param realDataPos
   * @param technicalIndicator
   * @param offsetTop
   * @private
   */
  _drawTechnicalIndicatorPromptText (technicalIndicatorData, realDataPos, technicalIndicator, offsetTop = 0) {
    const technicalIndicatorOptions = this._chartData.styleOptions().technicalIndicator
    const data = getTechnicalIndicatorInfo(technicalIndicatorData, technicalIndicator, this._yAxis)
    const colors = technicalIndicatorOptions.line.colors
    const dataList = this._chartData.dataList()
    const cbData = {
      preData: { kLineData: dataList[realDataPos - 1], technicalIndicatorData: technicalIndicator.result[realDataPos - 1] },
      currentData: { kLineData: dataList[realDataPos], technicalIndicatorData: technicalIndicator.result[realDataPos] }
    }
    const plots = technicalIndicator.plots
    const floatLayerPromptTechnicalIndicatorText = this._chartData.styleOptions().floatLayer.prompt.technicalIndicator.text
    const nameText = data.name
    const labels = data.labels
    const values = data.values
    const textMarginLeft = floatLayerPromptTechnicalIndicatorText.marginLeft
    const textMarginRight = floatLayerPromptTechnicalIndicatorText.marginRight
    let labelX = textMarginLeft
    const labelY = floatLayerPromptTechnicalIndicatorText.marginTop + offsetTop
    const textSize = floatLayerPromptTechnicalIndicatorText.size
    const textColor = floatLayerPromptTechnicalIndicatorText.color
    const colorSize = colors.length
    this._ctx.textBaseline = 'top'
    this._ctx.font = getFont(textSize, floatLayerPromptTechnicalIndicatorText.weight, floatLayerPromptTechnicalIndicatorText.family)
    const nameTextWidth = calcTextWidth(this._ctx, nameText)
    this._ctx.fillStyle = textColor
    this._ctx.fillText(nameText, labelX, labelY)
    labelX += (textMarginLeft + nameTextWidth)
    let lineCount = 0
    for (let i = 0; i < labels.length; i++) {
      switch (plots[i].type) {
        case PlotType.CIRCLE: {
          this._ctx.fillStyle = (plots[i].color && plots[i].color(cbData, technicalIndicatorOptions)) || technicalIndicatorOptions.circle.noChangeColor
          break
        }
        case PlotType.BAR: {
          this._ctx.fillStyle = (plots[i].color && plots[i].color(cbData, technicalIndicatorOptions)) || technicalIndicatorOptions.bar.noChangeColor
          break
        }
        case PlotType.LINE: {
          this._ctx.fillStyle = colors[lineCount % colorSize] || textColor
          lineCount++
          break
        }
        default: { break }
      }
      const text = `${labels[i]}: ${values[i].value || 'n/a'}`
      const textWidth = calcTextWidth(this._ctx, text)
      this._ctx.fillText(text, labelX, labelY)
      labelX += (textMarginLeft + textMarginRight + textWidth)
    }
  }

    /**
   * 绘制提示框
   * @private
   */
  _theHorizontalTooltip (crossHair) {
    if(labeledLineMatching && labeledLineMatchingData && labeledLineMatchingData.item){
      // 提示框的宽度
      let w = labeledLineMatchingData.item.boxStyle.width;
      // 提示框的高度======》画布高度-下放三角箭头的高度
      let h = labeledLineMatchingData.item.boxStyle.height;;
      // 定义canvas画笔的x坐标点
      let x = labeledLineHoldXY.x;
      // 定义canvas画笔的y坐标点
      let y = labeledLineHoldXY.y-h/2;
      // 定义圆角的半径
      let r = labeledLineMatchingData.item.boxStyle.borderRadius;
      if(x<w){
        x=labeledLineHoldXY.x;
      }else{
        x=labeledLineHoldXY.x-w;
      }
      if(x+w < this._ctx.canvas.width){
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
        // this._ctx.fillStyle = labeledLineMatchingData.item.boxStyle.background;
        this._ctx.strokeStyle=labeledLineMatchingData.item.boxStyle.borderColor;
        this._ctx.lineWidth=labeledLineMatchingData.item.boxStyle.borderLine;
        //沿着坐标点顺序的路径绘制直线
        this._ctx.stroke();
        // 关闭,形成一个闭合的回路---->轮廓
        this._ctx.closePath();
        // 填充
        // this._ctx.fill();

        let useX = x;
        
        labeledLineMatchingData.item.boxStyle.item.forEach(item=>{
          if(item.type=="text"){
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
    }
  }
}
