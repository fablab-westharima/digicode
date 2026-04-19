/**
 * ボード選択コンポーネント
 * コンパイル対象のボードを選択
 */

import { useTranslation } from 'react-i18next';
import { useBoardStore, SUPPORTED_BOARDS, type BoardDefinition } from '@/stores/boardStore';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Cpu, Cable } from 'lucide-react';

// Board ID to i18n key mapping
const BOARD_I18N_KEYS: Record<string, string> = {
  'esp32-generic': 'esp32Generic',
  'esp32-s3-generic': 'esp32S3',
  'esp32-c3-generic': 'esp32C3',
  'esp32-c6-generic': 'esp32C6',
  'm5stack-basic': 'm5stackBasic',
  'm5stickc-plus': 'm5stickCPlus',
  'atom-lite': 'atomLite',
  'atom-matrix': 'atomMatrix',
  'm5stamp-pico': 'm5stampPico',
  'm5stamp-c3': 'm5stampC3',
  'm5stamp-s3a': 'm5stampS3a',
  'xiao-esp32c3': 'xiaoEsp32C3',
  'xiao-esp32s3': 'xiaoEsp32S3',
  'xiao-esp32c6': 'xiaoEsp32C6',
  'rp2040-pico': 'rp2040Pico',
  'rp2040-pico-w': 'rp2040PicoW',
  'rp2040-xiao': 'xiaoRp2040',
  'rp2040-nano-connect': 'rp2040NanoConnect',
};

export function BoardSelector() {
  const { t } = useTranslation();
  const { selectedBoardId, setSelectedBoard, getSelectedBoard } = useBoardStore();
  const selectedBoard = getSelectedBoard();

  const getCategoryLabel = (category: string): string => {
    return t(`boardSelector.categories.${category}`, { defaultValue: category });
  };

  const getBoardName = (board: BoardDefinition): string => {
    const key = BOARD_I18N_KEYS[board.id];
    if (key) {
      return t(`boardSelector.boards.${key}.name`, { defaultValue: board.name });
    }
    return board.name;
  };

  const getBoardDescription = (board: BoardDefinition): string => {
    const key = BOARD_I18N_KEYS[board.id];
    if (key) {
      return t(`boardSelector.boards.${key}.description`, { defaultValue: board.description });
    }
    return board.description;
  };

  const genericBoards = SUPPORTED_BOARDS.filter(b => b.category === 'generic');
  const m5stackBoards = SUPPORTED_BOARDS.filter(b => b.category === 'm5stack');
  const xiaoBoards = SUPPORTED_BOARDS.filter(b => b.category === 'xiao');
  const rp2040Boards = SUPPORTED_BOARDS.filter(b => b.category === 'rp2040');

  const renderBoardItem = (board: BoardDefinition) => (
    <SelectItem key={board.id} value={board.id}>
      <div className="flex items-center gap-2">
        <span>{getBoardName(board)}</span>
        {!board.supportsOta && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
            <Cable className="h-3 w-3 mr-1" />
            {t('editor.board.wiredOnly')}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">- {getBoardDescription(board)}</span>
      </div>
    </SelectItem>
  );

  return (
    <div className="flex items-center gap-2">
      <Cpu className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedBoardId} onValueChange={setSelectedBoard}>
        <SelectTrigger className="w-[280px] h-8 text-sm">
          <SelectValue placeholder={t('editor.board.selectBoard')} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className="text-blue-600 font-semibold">{getCategoryLabel('generic')}</SelectLabel>
            {genericBoards.map(renderBoardItem)}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel className="text-orange-600 font-semibold">{getCategoryLabel('m5stack')}</SelectLabel>
            {m5stackBoards.map(renderBoardItem)}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel className="text-green-600 font-semibold">{getCategoryLabel('xiao')}</SelectLabel>
            {xiaoBoards.map(renderBoardItem)}
          </SelectGroup>
          {rp2040Boards.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-pink-600 font-semibold">{getCategoryLabel('rp2040')}</SelectLabel>
              {rp2040Boards.map(renderBoardItem)}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
