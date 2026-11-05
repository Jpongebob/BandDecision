'use client';

import { useMemo, useState } from 'react';
import { useActionState } from 'react';
import { parseUnavailableText } from '@/services/date-parser';
import { submitUnavailableAction, type FormState } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';

type DateReason = { date: string; reason: string };

function datesForRound(startDate: string, endDate: string, today: string) {
  const dates: string[] = [];
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const floor = new Date(`${today}T12:00:00`);
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    if (cursor >= floor) dates.push(cursor.toLocaleDateString('sv-SE'));
  }
  return dates;
}

export function AvailabilityForm({
  roundId,
  startDate,
  endDate,
  today,
  initialDates,
}: {
  roundId: string;
  startDate: string;
  endDate: string;
  today: string;
  initialDates: DateReason[];
}) {
  const [state, formAction, pending] = useActionState(submitUnavailableAction, {} as FormState);
  const [text, setText] = useState('');
  const [reason, setReason] = useState('');
  const [calendarDate, setCalendarDate] = useState('');
  const [rows, setRows] = useState<DateReason[]>(initialDates);
  const [ack, setAck] = useState(false);
  const [parseError, setParseError] = useState('');
  const validRoundDates = useMemo(() => datesForRound(startDate, endDate, today), [startDate, endDate, today]);
  const outsideRound = rows.filter((row) => !validRoundDates.includes(row.date));
  const sortedRows = [...rows].sort((a, b) => a.date.localeCompare(b.date));

  function upsertDate(date: string, why: string) {
    setRows((current) => {
      const existing = current.find((row) => row.date === date);
      return existing
        ? current.map((row) => row.date === date ? { ...row, reason: why || row.reason } : row)
        : [...current, { date, reason: why }];
    });
    setAck(false);
  }

  function addCalendarDate() {
    if (!calendarDate) return;
    if (calendarDate < today) { setParseError('지난 날짜는 입력할 수 없습니다.'); return; }
    setParseError('');
    upsertDate(calendarDate, reason.trim());
    setCalendarDate('');
  }

  function parseQuickInput() {
    setParseError('');
    try {
      const parsed = parseUnavailableText(text, today, startDate, endDate, reason.trim());
      if (parsed.dates.length === 0) {
        setRows([]);
        setAck(false);
        return;
      }
      const additions = parsed.dates.map((date) => ({ date, reason: reason.trim() }));
      setRows((current) => {
        const merged = new Map(current.map((row) => [row.date, row]));
        additions.forEach((row) => merged.set(row.date, { ...merged.get(row.date), ...row }));
        return [...merged.values()];
      });
      setAck(false);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : '날짜를 해석하지 못했습니다.');
    }
  }

  const invalidReason = sortedRows.some((row) => !row.reason.trim() || row.reason.trim().length > 200);
  const datesJson = JSON.stringify(sortedRows.map((row) => ({ date: row.date, reason: row.reason.trim() })));

  return (
    <Card>
      <h2 className="text-lg font-bold">불가능한 날짜 제출</h2>
      <p className="mt-1 text-sm text-slate-600">달력에서 날짜를 고르거나 빠른 입력을 사용하세요. 날짜마다 사유를 적을 수 있습니다.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block text-sm font-semibold">달력에서 날짜 선택
          <Input type="date" min={today} value={calendarDate} onChange={(event) => setCalendarDate(event.target.value)} />
        </label>
        <Button type="button" variant="secondary" onClick={addCalendarDate} disabled={!calendarDate}>날짜 추가</Button>
      </div>

      <label className="mt-3 block text-sm font-semibold">빠른 날짜 입력
        <Input value={text} onChange={(event) => setText(event.target.value)} placeholder="11.29~12.2, 12.29~1.2" />
      </label>
      <label className="mt-3 block text-sm font-semibold">빠른 입력의 기본 사유
        <Textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={200} placeholder="예: 야근" />
      </label>
      <Button type="button" variant="secondary" className="mt-3" onClick={parseQuickInput}>빠른 입력 날짜 추가</Button>
      {parseError && <p role="alert" className="mt-3 text-sm text-rose-700">{parseError}</p>}

      <div className="mt-4 rounded-xl bg-slate-50 p-4">
        <p className="font-semibold">선택 날짜 {sortedRows.length}일</p>
        {sortedRows.length === 0 ? <p className="mt-2 text-sm text-slate-500">선택한 날짜가 없습니다. 날짜가 없으면 빈 목록으로 제출하세요.</p> : (
          <ul className="mt-2 space-y-2">
            {sortedRows.map((row) => (
              <li key={row.date} className="grid gap-2 sm:grid-cols-[9rem_1fr_auto] sm:items-center">
                <span className="text-sm font-medium">{row.date}{!validRoundDates.includes(row.date) && <span className="ml-1 text-amber-700">회차 밖</span>}</span>
                <Input aria-label={`${row.date} 사유`} value={row.reason} maxLength={200} placeholder="불참 사유" onChange={(event) => setRows((current) => current.map((item) => item.date === row.date ? { ...item, reason: event.target.value } : item))} />
                <Button type="button" variant="ghost" onClick={() => { setRows((current) => current.filter((item) => item.date !== row.date)); setAck(false); }}>삭제</Button>
              </li>
            ))}
          </ul>
        )}
        {outsideRound.length > 0 && <>
          <p className="mt-3 text-sm text-amber-800">회차 범위 밖 날짜 {outsideRound.length}일은 이번 추천에 반영되지 않습니다.</p>
          <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} /> 회차 밖 날짜 저장에 동의합니다.</label>
        </>}
      </div>

      <form action={formAction} className="mt-4 grid gap-3">
        <input type="hidden" name="round_id" value={roundId} />
        <input type="hidden" name="dates_json" value={datesJson} />
        <input type="hidden" name="ack_outside" value={ack ? 'true' : 'false'} />
        {state.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}
        {state.success && <p role="status" className="text-sm text-emerald-700">{state.success}</p>}
        <Button disabled={pending || invalidReason || (outsideRound.length > 0 && !ack)}>{pending ? '저장 중…' : '일정 제출'}</Button>
      </form>
    </Card>
  );
}
