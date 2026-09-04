import {
  card,
  markdown,
  hr,
  button,
  textLine,
  columnSet,
  input,
  selectStatic,
  formContainer,
  formSubmitButton,
  formResetButton,
  note,
} from '../cards.js';

export function normalizeForm(form = {}) {
  const title = String(form.title || '报名表').trim().slice(0, 100) || '报名表';
  const fields = Array.isArray(form.fields)
    ? form.fields
        .filter((f) => f && typeof f === 'object')
        .slice(0, 6)
        .map((f, i) => {
          const type = f.type === 'select' ? 'select' : 'text';
          const options =
            type === 'select'
              ? (Array.isArray(f.options) ? f.options : [])
                  .filter((o) => typeof o === 'string' && o.trim())
                  .map((o) => o.trim())
                  .slice(0, 100) // select_static 上限 100 个选项（如全员名单报名）
              : [];
          return {
            name: `f${i + 1}`,
            label: String(f.label || `字段${i + 1}`).trim().slice(0, 40),
            type,
            required: f.required === true,
            options,
          };
        })
        .filter((f) => f.type !== 'select' || f.options.length >= 2)
    : [];
  return { title, fields };
}

function normalizeState(state = {}) {
  // 展开原对象保留 kind / chatId / messageId 等元信息（同 recordVote 的坑）
  return {
    ...state,
    ...normalizeForm(state),
    submissions: Array.isArray(state.submissions) ? state.submissions : [],
    closed: Boolean(state.closed),
  };
}

export function recordSubmission(state = {}, formValue = {}, openId, { operatorName } = {}) {
  const next = normalizeState(state);
  if (next.closed) return next;

  const values = {};
  for (const f of next.fields) {
    const raw = formValue?.[f.name];
    values[f.name] = raw == null ? '' : String(raw).trim();
  }
  // 姓名兜底：用户没填时取回调里携带的操作人飞书姓名，任何人提交都有身份
  if (operatorName) {
    const nameField = next.fields.find((f) => /姓名|名字|name/i.test(f.label));
    if (nameField && !values[nameField.name]) values[nameField.name] = operatorName;
  }

  const entry = { openId: openId || '', values, at: Date.now() };
  const idx = next.submissions.findIndex((s) => s.openId && s.openId === openId);
  if (idx >= 0) next.submissions[idx] = entry;
  else next.submissions.push(entry);
  return next;
}

function displayName(fields, submission, index) {
  const nameField = fields.find((f) => /姓名|名字|name/i.test(f.label));
  if (nameField) {
    const value = submission.values?.[nameField.name];
    if (value) return value;
  }
  return `第 ${index + 1} 位`;
}

function submissionLine(fields, submission, index) {
  const parts = fields
    .map((f) => `${f.label}：${submission.values?.[f.name] || '未填'}`)
    .join('，');
  return `- ${displayName(fields, submission, index)}（${parts}）`;
}

export function summarizeForm(state = {}) {
  const s = normalizeState(state);
  if (!s.submissions.length) return `「${s.title}」暂无人提交。`;
  const rows = s.submissions
    .map((sub, i) => `${i + 1}. ${submissionLine(s.fields, sub, i).replace(/^- /, '')}`)
    .join('\n');
  return `「${s.title}」共 ${s.submissions.length} 人提交：\n${rows}`;
}

export function buildFormCard(state = {}, sessionId) {
  const s = normalizeState(state);
  const elements = [markdown(`已提交 ${s.submissions.length} 份`)];

  const formElements = [];
  for (const f of s.fields) {
    formElements.push(textLine(f.required ? `${f.label} *` : f.label, { size: 'small', color: 'grey' }));
    if (f.type === 'select') {
      formElements.push(selectStatic(f.name, f.options, { placeholder: '请选择', required: f.required }));
    } else {
      formElements.push(input(f.name, { placeholder: '请输入', required: f.required }));
    }
  }
  formElements.push(
    columnSet([
      formSubmitButton('提交', { a: 'form_submit', p: { sessionId } }),
      formResetButton('清空'),
    ])
  );
  if (!s.closed) {
    elements.push(formContainer(`form_${sessionId}`, formElements));
  }

  if (s.submissions.length) {
    elements.push(hr());
    elements.push(textLine('提交记录', { size: 'small', color: 'grey', icon: 'list', iconColor: 'wathet' }));
    const RENDER_CAP = 20; // 卡片内只渲染前 20 条，防止大名单刷屏；导出与汇总仍是全量
    const shown = s.submissions.slice(0, RENDER_CAP);
    const lines = shown.map((sub, i) => submissionLine(s.fields, sub, i));
    if (s.submissions.length > RENDER_CAP) {
      lines.push(`- 另有 ${s.submissions.length - RENDER_CAP} 人已提交，导出表格查看全量`);
    }
    elements.push(markdown(lines.join('\n')));
  }

  if (s.closed) {
    elements.push(hr());
    elements.push(textLine('已结束并汇总', { icon: 'done', iconColor: 'wathet', color: 'grey' }));
    if (sessionId) {
      elements.push(
        columnSet([button('导出为表格', { a: 'export', p: { kind: 'export_form', sessionId } }, 'default', { icon: 'doc' })]),
        note('导出的表格包含按人明细表')
      );
    }
  } else {
    elements.push(
      columnSet([
        button('结束并汇总', { a: 'form_close', p: { sessionId } }, 'danger_text', { icon: 'done' }),
        button('导出为表格', { a: 'export', p: { kind: 'export_form', sessionId } }, 'text', { icon: 'doc' }),
      ]),
      note('提交按人去重，重复提交以最后一次为准')
    );
  }

  return card({
    template: 'wathet',
    icon: 'form',
    iconColor: 'wathet',
    title: '报名表',
    subtitle: s.title,
    tags: [s.closed ? { text: '已结束', color: 'neutral' } : { text: '进行中', color: 'wathet' }],
    elements,
  });
}
