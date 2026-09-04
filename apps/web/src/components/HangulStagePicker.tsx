import { HANGUL_BOOKS, HANGUL_STAGES, hangulStageOptionLabel } from '@dailyglow/utils';

interface HangulStagePickerProps {
  /** 현재 단계 번호(1~35). 한글 과목의 profile_subject_levels.level 과 같은 값이다. */
  value: number;
  /** 사용자가 다른 단계를 고르면 그 번호로 부른다. */
  onChange: (stage: number) => void;
  /**
   * 접근성 라벨. 설정 화면과 온보딩 화면이 이 select 를 서로 다르게 불러야 해서
   * 부르는 쪽이 정하도록 밖으로 뺐다. id 를 주면 바깥 <label htmlFor> 과도 이어진다.
   */
  'aria-label'?: string;
  id?: string;
  /** 화면마다 테두리·여백이 달라서 클래스도 부르는 쪽이 정한다. */
  className?: string;
}

/**
 * 한글 35단계를 권(<optgroup>)으로 묶어 보여주는 드롭다운.
 *
 * 맨 숫자 35개는 부모에게 아무것도 알려주지 않는다. 권으로 묶고 각 줄에
 * `4단계 · 기본 자음 'ㄷ' (다, 댜, 더, 뎌…)` 처럼 무엇을 배우는지 함께 적는다.
 * 설정 화면과 온보딩 화면이 똑같은 목록을 써야 해서 한 곳에 둔다.
 */
export function HangulStagePicker({
  value,
  onChange,
  id,
  className,
  'aria-label': ariaLabel,
}: HangulStagePickerProps) {
  return (
    <select
      id={id}
      aria-label={ariaLabel}
      className={className}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {HANGUL_BOOKS.map((b) => (
        <optgroup key={b.book} label={`${b.book}권 · ${b.shortTitle}`}>
          {HANGUL_STAGES.filter((x) => x.book === b.book).map((x) => (
            <option key={x.stage} value={x.stage}>
              {hangulStageOptionLabel(x)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
