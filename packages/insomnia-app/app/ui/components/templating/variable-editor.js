import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import autobind from 'autobind-decorator';
import OneLineEditor from '../codemirror/one-line-editor';

@autobind
class VariableEditor extends PureComponent {
  constructor(props) {
    super(props);
    this.textAreaRef = React.createRef();
    const inner = props.defaultValue.replace(/\s*}}$/, '').replace(/^{{\s*/, '');

    this.state = {
      variables: [],
      value: `{{ ${inner} }}`,
      preview: '',
      error: '',
    };
  }

  componentDidMount() {
    this._update(this.state.value, true);
    this._resize();
  }

  componentDidUpdate() {
    this._resize();
  }

  _resize() {
    setTimeout(() => {
      const element = this.textAreaRef.current;
      element.style.cssText = 'height:auto';
      element.style.cssText = `height:${element.scrollHeight}px;overflow:hidden`;
    }, 200);
  }

  _setSelectRef(n) {
    this._select = n;

    // Let it render, then focus the input
    setTimeout(() => {
      this._select && this._select.focus();
    }, 100);
  }

  async _update(value, noCallback = false) {
    const { handleRender } = this.props;
    const cleanedValue = value
      .replace(/^{%/, '')
      .replace(/%}$/, '')
      .replace(/^{{/, '')
      .replace(/}}$/, '')
      .trim();
    let preview = '';
    let error = '';

    try {
      preview = await handleRender(value);
    } catch (err) {
      error = err.message;
    }

    const context = await this.props.handleGetRenderContext();
    const variables = context.keys;
    const variableSource = context.context.getKeysContext().keyContext[cleanedValue] || '';
    // Hack to skip updating if we unmounted for some reason
    if (this._select) {
      this.setState({ preview, error, variables, value, variableSource });
    }

    // Call the callback if we need to
    if (!noCallback) {
      this.props.onChange(value);
    }
  }

  render() {
    const {
      environment,
      handleRender,
      handleGetRenderContext,
      nunjucksPowerUserMode,
      isVariableUncovered,
    } = this.props;
    const { error, value, preview, variables, variableSource } = this.state;
    const isOther = !variables.find(v => value === `{{ ${v.name} }}`);
    return (
      <div>
        <div className="form-control form-control--outlined">
          <label>
            Environment Variable
            {!isOther && (
              <span className="pull-right">
                {variableSource !== 'root' && environment && environment.color ? (
                  <i className="fa fa-circle space-right" style={{ color: environment.color }} />
                ) : null}
                {variableSource}
              </span>
            )}
            <select
              ref={this._setSelectRef}
              {...{ value }}
              onChange={event => {
                this._update(event.target.value);
              }}>
              <option value={"{{ 'my custom template logic' | urlencode }}"}>-- Custom --</option>
              {variables.map((v, i) => (
                <option key={`${i}::${v.name}`} value={`{{ ${v.name} }}`}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-control form-control--outlined">
          <label>
            {isOther ? 'Set a custom value' : 'Edit value'}
            <OneLineEditor
              forceEditor
              type="text"
              render={handleRender}
              nunjucksPowerUserMode={nunjucksPowerUserMode}
              isVariableUncovered={isVariableUncovered}
              getRenderContext={handleGetRenderContext}
              defaultValue={value}
              onPaste={event => {
                this._update(event.clipboardData.getData('text/plain'));
              }}
              onChange={this._update.bind(this)}
            />
          </label>
        </div>

        <div className="form-control form-control--outlined">
          <label>
            Live Preview
            {error ? (
              <textarea className="danger" value={error || 'Error'} readOnly />
            ) : (
              <textarea ref={this.textAreaRef} value={preview || ''} readOnly />
            )}
          </label>
        </div>
      </div>
    );
  }
}

VariableEditor.propTypes = {
  handleRender: PropTypes.func.isRequired,
  handleGetRenderContext: PropTypes.func.isRequired,
  defaultValue: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  environment: PropTypes.object,
  nunjucksPowerUserMode: PropTypes.bool,
  isVariableUncovered: PropTypes.bool,
  uniqueKey: PropTypes.string,
};

export default VariableEditor;
