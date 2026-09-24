import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSenders, scheduleEmail, fetchCurrentUser, autoGenerateSender } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import LinkExtension from '@tiptap/extension-link';
import PlaceholderExtension from '@tiptap/extension-placeholder';
import sanitizeHtml from 'sanitize-html';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  ChevronDown,
  Calendar,
  Undo2,
  Redo2,
  Type,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  ChevronsUpDown,
  List,
  ListOrdered,
  Outdent,
  Indent,
  Quote,
  Link2,
  Strikethrough,
  AlertCircle,
  RemoveFormatting,
  X,
  Upload,
} from 'lucide-react';

export interface EmailAttachment {
  filename: string;
  content: string; // base64 string
  contentType: string;
  size: number;
}

export const ComposeEmail: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const excelInputRef = useRef<HTMLInputElement | null>(null);

  const [senderId, setSenderId] = useState('');
  const [toEmails, setToEmails] = useState<string[]>([
    'tame@jmail.com',
    'lame@jmail.com',
    'dame@jmail.com',
    'kame@jmail.com',
    'rame@jmail.com',
    'same@jmail.com',
    'zame@jmail.com',
  ]);
  const [toInput, setToInput] = useState('');
  const [isExpandedTo, setIsExpandedTo] = useState(false);

  const [subject, setSubject] = useState('');
  const [delaySec, setDelaySec] = useState('00');
  const [hourlyLimit, setHourlyLimit] = useState('00');
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);

  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const [showSendLaterModal, setShowSendLaterModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      UnderlineExtension,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-[#20c997] underline' },
      }),
      PlaceholderExtension.configure({
        placeholder: 'Type Your Reply...',
      }),
    ],
    editorProps: {
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        let hasImage = false;
        for (const item of Array.from(items)) {
          if (item.type.indexOf('image') === 0) {
            hasImage = true;
            const file = item.getAsFile();
            if (!file) continue;

            const filename = file.name && file.name !== 'image.png' ? file.name : `pasted_image_${Date.now()}.png`;

            const reader = new FileReader();
            reader.onload = (e) => {
              const fullDataUrl = e.target?.result as string;
              if (fullDataUrl) {
                const base64Content = fullDataUrl.split(',')[1];
                setAttachments((prev) => [
                  ...prev,
                  {
                    filename,
                    content: base64Content,
                    contentType: file.type || 'image/png',
                    size: file.size,
                  },
                ]);

                // Create HTML image element string
                const imgHtml = `<p><img src="${fullDataUrl}" alt="${filename}" style="max-width: 100%; max-height: 400px; object-fit: contain; border-radius: 12px; margin: 8px 0; display: block;" /></p>`;

                // Insert directly into active DOM selection inside ProseMirror textpad
                if (!view.isDestroyed) {
                  view.focus();
                  document.execCommand('insertHTML', false, imgHtml);
                }
              }
            };
            reader.readAsDataURL(file);
          }
        }
        return hasImage;
      },
    },
    content: '',
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: fetchCurrentUser,
  });

  const { data: senders } = useQuery({
    queryKey: ['senders'],
    queryFn: fetchSenders,
  });

  const autoGenerateMutation = useMutation({
    mutationFn: autoGenerateSender,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['senders'] });
      if (data?.data?.id) {
        setSenderId(data.data.id);
      }
    },
  });

  // Pre-select sender or auto-generate for logged in user
  useEffect(() => {
    if (senders && senders.length > 0) {
      if (!senderId) {
        setSenderId(senders[0].id);
      }
    } else if (senders && senders.length === 0 && currentUser?.email && !autoGenerateMutation.isPending) {
      autoGenerateMutation.mutate({
        name: currentUser.email.split('@')[0],
        email: currentUser.email,
      });
    }
  }, [senders, senderId, currentUser]);

  // Set default schedule time to current + 5 minutes
  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    setScheduleDate(now.toISOString().split('T')[0]);
    setScheduleTime(now.toTimeString().substring(0, 5));
  }, []);

  const scheduleMutation = useMutation({
    mutationFn: scheduleEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails-scheduled'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      navigate('/scheduled');
    },
    onError: (err: any) => {
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to schedule email. Please try again.'
      );
    },
  });

  const getScheduledAtDate = (): Date => {
    if (!scheduleDate || !scheduleTime) return new Date();
    return new Date(`${scheduleDate}T${scheduleTime}:00`);
  };

  const handleSendNow = () => {
    submitEmail(new Date());
  };

  const handleSendLaterDone = () => {
    setShowSendLaterModal(false);
    submitEmail(getScheduledAtDate());
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // 5MB limit check per file
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage(`File "${file.name}" exceeds 5MB limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = (reader.result as string).split(',')[1];
        setAttachments((prev) => [
          ...prev,
          {
            filename: file.name,
            content: base64Data,
            contentType: file.type || 'application/octet-stream',
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const addEmailTag = (email: string) => {
    const cleaned = email.trim().toLowerCase();
    if (!cleaned) return;
    if (!toEmails.includes(cleaned)) {
      setToEmails((prev) => [...prev, cleaned]);
    }
  };

  const handleToKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ' || e.key === 'Tab') {
      e.preventDefault();
      if (toInput) {
        addEmailTag(toInput);
        setToInput('');
      }
    } else if (e.key === 'Backspace' && !toInput && toEmails.length > 0) {
      setToEmails((prev) => prev.slice(0, -1));
    }
  };

  const handleToBlur = () => {
    if (toInput) {
      addEmailTag(toInput);
      setToInput('');
    }
  };

  const handleRemoveToEmail = (index: number) => {
    setToEmails((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        let content = '';
        if (typeof buffer === 'string') {
          content = buffer;
        } else if (buffer instanceof ArrayBuffer) {
          const decoder = new TextDecoder('utf-8');
          content = decoder.decode(buffer);
        }

        // Match all email patterns inside Excel file data, CSV text, or TXT
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
        const matches = content.match(emailRegex);

        if (matches && matches.length > 0) {
          const uniqueNewEmails = Array.from(new Set(matches.map((m) => m.toLowerCase())));
          setToEmails((prev) => {
            const set = new Set([...prev, ...uniqueNewEmails]);
            return Array.from(set);
          });
        } else {
          setErrorMessage(`No valid email addresses found in "${file.name}".`);
        }
      } catch (err) {
        console.error('Failed to parse file for emails', err);
        setErrorMessage('Failed to read file. Please ensure it is a valid Excel or CSV file.');
      }
    };

    reader.readAsArrayBuffer(file);
    if (excelInputRef.current) {
      excelInputRef.current.value = '';
    }
  };

  const submitEmail = (targetDate: Date) => {
    setErrorMessage(null);
    if (!senderId) {
      setErrorMessage('Please select a sender account.');
      return;
    }

    const finalRecipients = [...toEmails];
    if (toInput.trim() && !finalRecipients.includes(toInput.trim().toLowerCase())) {
      finalRecipients.push(toInput.trim().toLowerCase());
    }

    if (finalRecipients.length === 0) {
      setErrorMessage('Please enter at least one recipient email.');
      return;
    }

    if (!subject.trim()) {
      setErrorMessage('Subject cannot be empty.');
      return;
    }

    const rawHtml = editor?.getHTML() || '';
    const cleanHtml = sanitizeHtml(rawHtml, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['u', 's', 'ins', 'del', 'p', 'br', 'img']),
      allowedAttributes: {
        a: ['href', 'name', 'target', 'class'],
        img: ['src', 'alt', 'class', 'width', 'height'],
      },
      allowedSchemesByTag: {
        img: ['http', 'https', 'data'],
      },
    });

    scheduleMutation.mutate({
      senderId,
      toEmail: finalRecipients.join(', '),
      subject,
      body: cleanHtml || '<p>No content</p>',
      scheduledAt: targetDate.toISOString(),
      attachments: attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
      delaySec: parseInt(delaySec, 10) || 0,
      hourlyLimit: parseInt(hourlyLimit, 10) || 0,
    });
  };

  const setPresetSchedule = (hoursToAdd: number, specificHour?: number) => {
    const d = new Date();
    if (specificHour !== undefined) {
      d.setDate(d.getDate() + 1);
      d.setHours(specificHour, 0, 0, 0);
    } else {
      d.setHours(d.getHours() + hoursToAdd);
    }
    setScheduleDate(d.toISOString().split('T')[0]);
    setScheduleTime(d.toTimeString().substring(0, 5));
  };

  const handleInsertLink = () => {
    if (!editor) return;
    if (!linkUrl) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    setShowLinkModal(false);
    setLinkUrl('');
  };

  const selectedSender = senders?.find((s) => s.id === senderId);
  const senderDisplayEmail = selectedSender?.email || currentUser?.email || 'oliver.brown@domain.io';

  return (
    <div className="max-w-5xl mx-auto font-sans select-none pb-12 relative">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1 text-[#2d3748] hover:text-black transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[1.3rem] font-bold text-[#2d3748] tracking-tight">
            Compose New Email
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[#a0aec0] hover:text-[#4a5568] p-1 transition-colors relative"
            title="Attach File"
          >
            <Paperclip className="w-5 h-5" />
            {attachments.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#20c997] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {attachments.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowSendLaterModal((prev) => !prev)}
            className={`p-1 transition-colors ${
              showSendLaterModal ? 'text-[#20c997]' : 'text-[#a0aec0] hover:text-[#4a5568]'
            }`}
            title="Schedule / Send Later"
          >
            <Clock className="w-5 h-5" />
          </button>
          <button
            onClick={handleSendNow}
            disabled={scheduleMutation.isPending}
            className="h-[38px] px-7 rounded-full border-2 border-[#20c997] bg-white text-[#20c997] hover:bg-[#20c997] hover:text-white font-bold text-xs flex items-center justify-center transition-all disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Email Composition Container */}
      <div className="space-y-4">
        {/* From Row */}
        <div className="flex items-center gap-4 py-1">
          <span className="w-16 text-[0.88rem] font-medium text-[#718096]">From</span>
          <div className="relative inline-block">
            {senders && senders.length > 0 ? (
              <select
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                className="appearance-none bg-[#f4f6f5] hover:bg-[#edf2f0] text-[0.88rem] font-semibold text-[#2d3748] px-4 py-2 pr-9 rounded-xl border-none focus:outline-none cursor-pointer transition-colors"
              >
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.email}
                  </option>
                ))}
              </select>
            ) : (
              <div className="bg-[#f4f6f5] text-[0.88rem] font-semibold text-[#2d3748] px-4 py-2 rounded-xl">
                {senderDisplayEmail}
              </div>
            )}
            <ChevronDown className="w-4 h-4 text-[#a0aec0] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* To Row with Email Pills & Upload List */}
        <div className="flex items-center gap-4 py-2 border-b border-[#f0f2f1] min-h-[46px]">
          <span className="w-16 text-[0.88rem] font-medium text-[#718096] shrink-0">To</span>

          <div className="flex-1 flex flex-wrap items-center gap-2">
            {/* Email Pills */}
            {(isExpandedTo ? toEmails : toEmails.slice(0, 3)).map((email, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#e6fcf5] border border-[#20c997]/40 text-[#0ca678] rounded-full text-xs font-semibold shadow-2xs"
              >
                {email}
                <button
                  type="button"
                  onClick={() => handleRemoveToEmail(idx)}
                  className="hover:text-rose-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* +N badge if more than 3 emails */}
            {!isExpandedTo && toEmails.length > 3 && (
              <button
                type="button"
                onClick={() => setIsExpandedTo(true)}
                className="px-2.5 py-1 bg-[#e6fcf5] border border-[#20c997]/40 text-[#0ca678] rounded-full text-xs font-bold hover:bg-[#d0f7eb] transition-colors"
                title="Click to view all recipient emails"
              >
                +{toEmails.length - 3}
              </button>
            )}

            {isExpandedTo && toEmails.length > 3 && (
              <button
                type="button"
                onClick={() => setIsExpandedTo(false)}
                className="text-xs text-[#718096] hover:text-[#2d3748] font-medium underline px-1"
              >
                Show less
              </button>
            )}

            {/* Input field for typing emails */}
            <input
              type="text"
              placeholder={toEmails.length === 0 ? "recipient@example.com" : "Add email..."}
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              onKeyDown={handleToKeyDown}
              onBlur={handleToBlur}
              className="flex-1 min-w-[150px] bg-transparent text-[0.88rem] text-[#2d3748] placeholder-[#a0aec0] focus:outline-none"
            />
          </div>

          {/* Hidden Excel File Input */}
          <input
            type="file"
            ref={excelInputRef}
            onChange={handleExcelUpload}
            accept=".xlsx, .xls, .csv, .txt, .tsv"
            className="hidden"
          />

          {/* Upload & Sample Download Actions */}
          <div className="flex items-center gap-3 shrink-0 pl-2">
            <a
              href="/demo_email_list.csv"
              download="demo_email_list.csv"
              className="text-[11px] font-medium text-[#718096] hover:text-[#20c997] transition-colors underline"
              title="Download a sample CSV email list file"
            >
              Sample CSV
            </a>
            <button
              type="button"
              onClick={() => excelInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#20c997] hover:text-[#0ca678] transition-colors cursor-pointer"
              title="Upload Excel or CSV file containing email addresses"
            >
              <Upload className="w-4 h-4" />
              <span>Upload List</span>
            </button>
          </div>
        </div>

        {/* Subject Row */}
        <div className="flex items-center gap-4 py-2 border-b border-[#f0f2f1]">
          <span className="w-16 text-[0.88rem] font-medium text-[#718096]">Subject</span>
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 bg-transparent text-[0.88rem] text-[#2d3748] placeholder-[#a0aec0] focus:outline-none"
          />
        </div>

        {/* Delay & Hourly Limit Inputs */}
        <div className="flex items-center gap-6 py-2">
          <div className="flex items-center gap-3">
            <span className="text-[0.88rem] font-medium text-[#2d3748]">
              Delay between 2 emails
            </span>
            <input
              type="text"
              value={delaySec}
              onChange={(e) => setDelaySec(e.target.value)}
              className="w-14 h-9 bg-[#f4f6f5] text-center text-[0.88rem] font-semibold text-[#2d3748] rounded-xl border border-[#e2e8f0] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[0.88rem] font-medium text-[#2d3748]">
              Hourly Limit
            </span>
            <input
              type="text"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(e.target.value)}
              className="w-14 h-9 bg-[#f4f6f5] text-center text-[0.88rem] font-semibold text-[#2d3748] rounded-xl border border-[#e2e8f0] focus:outline-none"
            />
          </div>
        </div>

        {/* Attached Files List Pills */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 py-2">
            <span className="text-xs font-semibold text-[#718096]">Attachments:</span>
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#e6fcf5] border border-[#20c997]/30 text-[#0ca678] rounded-full text-xs font-medium"
              >
                <Paperclip className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[180px] truncate" title={att.filename}>
                  {att.filename}
                </span>
                <span className="text-[10px] text-[#718096]">
                  ({(att.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(idx)}
                  className="hover:text-rose-600 transition-colors ml-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Rich Email Editor Container */}
        <div className="bg-[#f9fafb] rounded-[24px] p-6 border border-[#f0f2f1] min-h-[380px] flex flex-col">
          {/* Formatting Toolbar at top of editor card */}
          <div className="pb-4 mb-3 border-b border-[#edf2f7] flex flex-wrap items-center gap-4 text-[#a0aec0] bg-white/70 px-4 py-2.5 rounded-full shadow-xs border border-[#edf2f7]">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().undo().run(); }}
              disabled={!editor?.can().undo()}
              title="Undo (Ctrl+Z)"
              className="hover:text-[#4a5568] disabled:opacity-30 transition-colors"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().redo().run(); }}
              disabled={!editor?.can().redo()}
              title="Redo (Ctrl+Shift+Z)"
              className="hover:text-[#4a5568] disabled:opacity-30 transition-colors"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <span className="h-4 w-px bg-[#e2e8f0]" />

            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleHeading({ level: 2 }).run(); }}
              className={`hover:text-[#4a5568] flex items-center gap-0.5 transition-colors ${
                editor?.isActive('heading') ? 'text-[#20c997] font-bold' : ''
              }`}
              title="Heading Format"
            >
              <Type className="w-4 h-4" />
              <ChevronsUpDown className="w-3 h-3" />
            </button>

            <span className="h-4 w-px bg-[#e2e8f0]" />

            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBold().run(); }}
              className={`hover:text-[#4a5568] transition-colors ${
                editor?.isActive('bold') ? 'text-[#20c997] font-bold' : ''
              }`}
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>

            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleItalic().run(); }}
              className={`hover:text-[#4a5568] transition-colors ${
                editor?.isActive('italic') ? 'text-[#20c997] font-bold' : ''
              }`}
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>

            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleUnderline().run(); }}
              className={`hover:text-[#4a5568] transition-colors ${
                editor?.isActive('underline') ? 'text-[#20c997] font-bold' : ''
              }`}
              title="Underline (Ctrl+U)"
            >
              <UnderlineIcon className="w-4 h-4" />
            </button>

            <span className="h-4 w-px bg-[#e2e8f0]" />

            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().run(); }}
              className="hover:text-[#4a5568] transition-colors"
              title="Left Align"
            >
              <AlignLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().run(); }}
              className="hover:text-[#4a5568] flex items-center gap-0.5 transition-colors"
              title="Align Options"
            >
              <ChevronsUpDown className="w-3 h-3" />
            </button>

            <span className="h-4 w-px bg-[#e2e8f0]" />

            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleOrderedList().run(); }}
              className={`hover:text-[#4a5568] transition-colors ${
                editor?.isActive('orderedList') ? 'text-[#20c997] font-bold' : ''
              }`}
              title="Ordered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>

            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBulletList().run(); }}
              className={`hover:text-[#4a5568] transition-colors ${
                editor?.isActive('bulletList') ? 'text-[#20c997] font-bold' : ''
              }`}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>

            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().liftListItem('listItem').run(); }}
              className="hover:text-[#4a5568] transition-colors"
              title="Decrease Indent"
            >
              <Outdent className="w-4 h-4" />
            </button>

            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().sinkListItem('listItem').run(); }}
              className="hover:text-[#4a5568] transition-colors"
              title="Increase Indent"
            >
              <Indent className="w-4 h-4" />
            </button>

            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBlockquote().run(); }}
              className={`hover:text-[#4a5568] transition-colors ${
                editor?.isActive('blockquote') ? 'text-[#20c997] font-bold' : ''
              }`}
              title="Blockquote"
            >
              <Quote className="w-4 h-4" />
            </button>

            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                const previousUrl = editor?.getAttributes('link').href || '';
                setLinkUrl(previousUrl);
                setShowLinkModal(true);
              }}
              className={`hover:text-[#4a5568] transition-colors ${
                editor?.isActive('link') ? 'text-[#20c997] font-bold' : ''
              }`}
              title="Hyperlink"
            >
              <Link2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleStrike().run(); }}
              className={`hover:text-[#4a5568] transition-colors ${
                editor?.isActive('strike') ? 'text-[#20c997] font-bold' : ''
              }`}
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </button>

            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().unsetAllMarks().clearNodes().run(); }}
              className="hover:text-[#4a5568] transition-colors ml-auto"
              title="Clear Formatting"
            >
              <RemoveFormatting className="w-4 h-4" />
            </button>
          </div>

          {/* Text Pad Editing Area */}
          <div className="flex-1 cursor-text pt-1" onClick={() => editor?.chain().focus().run()}>
            <EditorContent editor={editor} className="min-h-[260px] text-[0.92rem] text-[#2d3748] font-sans" />
          </div>
        </div>
      </div>

      {/* Link URL Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
          <div className="bg-white rounded-[20px] p-5 max-w-sm w-full shadow-2xl border border-[#e2e8f0] space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-[#2d3748]">Insert Hyperlink</h3>
            <input
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full h-10 px-3 bg-[#f4f6f5] rounded-xl text-xs text-[#2d3748] border border-[#e2e8f0] focus:outline-none"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-3 py-1.5 text-xs text-[#718096] font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertLink}
                className="px-4 py-1.5 bg-[#20c997] text-white rounded-full text-xs font-bold shadow-sm"
              >
                Apply Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Send Later Scheduler Card */}
      {showSendLaterModal && (
        <div className="absolute top-16 right-0 z-30 w-[270px] bg-white rounded-[20px] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.12)] border border-[#e2e8f0] space-y-4 animate-in fade-in zoom-in-95">
          <h3 className="text-[0.92rem] font-bold text-[#2d3748]">
            Send Later
          </h3>

          {/* Date & Time Picker */}
          <div className="relative border-b border-[#edf2f7] pb-2">
            <div className="flex items-center justify-between text-xs text-[#a0aec0]">
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="bg-transparent text-[0.82rem] font-semibold text-[#2d3748] focus:outline-none"
              />
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="bg-transparent text-[0.82rem] font-semibold text-[#2d3748] focus:outline-none"
              />
              <Calendar className="w-4 h-4 text-[#a0aec0]" />
            </div>
          </div>

          {/* Quick Schedule Suggestions */}
          <div className="space-y-2 text-[0.82rem] text-[#718096]">
            <button
              type="button"
              onClick={() => setPresetSchedule(24)}
              className="block w-full text-left font-medium hover:text-[#1a202c] transition-colors"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setPresetSchedule(0, 10)}
              className="block w-full text-left font-medium hover:text-[#1a202c] transition-colors"
            >
              Tomorrow, 10:00 AM
            </button>
            <button
              type="button"
              onClick={() => setPresetSchedule(0, 11)}
              className="block w-full text-left font-medium hover:text-[#1a202c] transition-colors"
            >
              Tomorrow, 11:00 AM
            </button>
            <button
              type="button"
              onClick={() => setPresetSchedule(0, 15)}
              className="block w-full text-left font-medium hover:text-[#1a202c] transition-colors"
            >
              Tomorrow, 3:00 PM
            </button>
          </div>

          {/* Card Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowSendLaterModal(false)}
              className="text-xs font-bold text-[#718096] hover:text-[#1a202c] px-2 py-1 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendLaterDone}
              className="h-[32px] px-5 rounded-full border-2 border-[#20c997] bg-white text-[#20c997] hover:bg-[#20c997] hover:text-white font-bold text-xs flex items-center justify-center transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};



