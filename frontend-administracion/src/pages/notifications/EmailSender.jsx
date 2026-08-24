import { useMemo, useState } from 'react';
import { Mail, Paperclip, Send } from 'lucide-react';
import { Button, Card, Input, Select, Textarea } from '@/components/common';
import { mailService } from '@/services/notificationsService';
import './email-sender.css';

const modes = {
  codes: { label: 'Códigos y mensaje', codes: true, files: false },
  attachments: { label: 'Mensaje y archivos', codes: false, files: true },
  codes_attachments: { label: 'Códigos, mensaje y archivos', codes: true, files: true },
  message: { label: 'Sólo mensaje', codes: false, files: false },
};
const lines = (value) => value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);

export default function EmailSender() {
  const [form, setForm] = useState({ mode: 'codes', emails: '', codes: '', subject: '', message: '' });
  const [files, setFiles] = useState([]);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(null);
  const [notice, setNotice] = useState('');
  const mode = modes[form.mode];
  const recipients = useMemo(() => lines(form.emails), [form.emails]);
  const codes = useMemo(() => lines(form.codes), [form.codes]);
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setNotice('');
    if (!recipients.length) return setNotice('Agrega al menos un correo.');
    if (mode.codes && recipients.length !== codes.length) {
      return setNotice('Debe existir exactamente un código por cada correo y en el mismo orden.');
    }
    if (mode.files && !files.length) return setNotice('Selecciona al menos un archivo.');
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (files.length > 5 || files.some((file) => file.size > 10 * 1024 * 1024) || totalBytes > 25 * 1024 * 1024) {
      return setNotice('Máximo 5 archivos, 10 MB por archivo y 25 MB en total.');
    }
    setWorking(true);
    let sent = 0;
    let failed = 0;
    try {
      for (let offset = 0; offset < recipients.length; offset += 5) {
        const batch = recipients.slice(offset, offset + 5).map((email, index) => ({
          email,
          code: mode.codes ? codes[offset + index] : undefined,
        }));
        setProgress({ processed: offset, total: recipients.length, sent, failed });
        const body = new FormData();
        body.set('mode', form.mode);
        body.set('subject', form.subject);
        body.set('message', form.message);
        body.set('recipients', JSON.stringify(batch));
        if (mode.files) files.forEach((file) => body.append('attachments', file));
        const result = await mailService.sendBatch(body);
        sent += result.sent;
        failed += result.failed;
      }
      setProgress({ processed: recipients.length, total: recipients.length, sent, failed });
      setNotice(`Proceso terminado: ${sent} enviados y ${failed} fallidos.`);
    } catch (error) {
      setNotice(`El proceso se detuvo: ${error.message}. Ya se enviaron ${sent} correos.`);
    } finally {
      setWorking(false);
    }
  };

  return <div className="mail-sender">
    <header className="page-heading"><div><p className="eyebrow">Comunicaciones de plataforma</p><h1>Envío de correos</h1><p>Envía mensajes, códigos individuales y documentos desde la cuenta institucional de Academia CABSA.</p></div><Mail /></header>
    <form onSubmit={submit}>
      <Card className="mail-sender-card">
        <Select label="Tipo de envío" value={form.mode} onChange={update('mode')}>
          {Object.entries(modes).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
        </Select>
        <div className="mail-sender-columns">
          <Textarea label={`Correos (${recipients.length}) — uno por línea`} rows="10" value={form.emails} onChange={update('emails')} required />
          {mode.codes && <Textarea label={`Códigos (${codes.length}) — uno por línea`} rows="10" value={form.codes} onChange={update('codes')} required />}
        </div>
        <Input label="Asunto" value={form.subject} onChange={update('subject')} required maxLength="180" />
        <Textarea label="Mensaje" rows="7" value={form.message} onChange={update('message')} required />
        {mode.files && <label className="mail-file"><span><Paperclip /> Archivos adjuntos</span><input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={(event) => setFiles([...event.target.files])} /><small>{files.length ? `${files.length} archivo(s) · ${(files.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(1)} MB` : 'Máximo 5 archivos; 10 MB cada uno y 25 MB en total.'}</small></label>}
        {progress && <div className="mail-progress" role="status"><progress value={progress.processed} max={progress.total} /><span>{progress.processed} de {progress.total} procesados · {progress.sent} enviados · {progress.failed} fallidos</span></div>}
        {notice && <div className={notice.includes('terminado') ? 'alert alert--success' : 'alert alert--error'} role="status">{notice}</div>}
        <Button type="submit" disabled={working}><Send /> {working ? 'Enviando lotes…' : 'Iniciar envío'}</Button>
      </Card>
    </form>
  </div>;
}
