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

import Widget from './Widget'
import XAxisView from '../view/XAxisView'
import XAxisFloatLayerView from '../view/XAxisFloatLayerView'

export default class XAxisWidget extends Widget {
  _createMainView (container, props) {
    return new XAxisView(container, props.chartData, props.xAxis)
  }

  _createFloatLayerView (container, props) {
    return new XAxisFloatLayerView(container, props.chartData, props.xAxis)
  }
}
