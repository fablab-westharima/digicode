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

export function BoardSelector() {
  const { t } = useTranslation();
  const { selectedBoardId, setSelectedBoard, getSelectedBoard } = useBoardStore();
  const selectedBoard = getSelectedBoard();

  const getCategoryLabel = (category: BoardDefinition['category']): string => {
    const labelKey = `editor.board.category${category.charAt(0).toUpperCase() + category.slice(1)}`;
    return t(labelKey, { defaultValue: category });
  };

  const arduinoBoards = SUPPORTED_BOARDS.filter(b => b.category === 'arduino');
  const esp8266Boards = SUPPORTED_BOARDS.filter(b => b.category === 'esp8266');
  const genericBoards = SUPPORTED_BOARDS.filter(b => b.category === 'generic');
  const m5stackBoards = SUPPORTED_BOARDS.filter(b => b.category === 'm5stack');
  const xiaoBoards = SUPPORTED_BOARDS.filter(b => b.category === 'xiao');
  const rp2040Boards = SUPPORTED_BOARDS.filter(b => b.category === 'rp2040');

  const renderBoardItem = (board: BoardDefinition) => (
    <SelectItem key={board.id} value={board.id}>
      <div className="flex items-center gap-2">
        <span>{board.name}</span>
        {!board.supportsOta && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
            <Cable className="h-3 w-3 mr-1" />
            {t('editor.board.wiredOnly')}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">- {board.description}</span>
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
          {arduinoBoards.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-purple-600 font-semibold">{getCategoryLabel('arduino')}</SelectLabel>
              {arduinoBoards.map(renderBoardItem)}
            </SelectGroup>
          )}
          {esp8266Boards.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-cyan-600 font-semibold">{getCategoryLabel('esp8266')}</SelectLabel>
              {esp8266Boards.map(renderBoardItem)}
            </SelectGroup>
          )}
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
