import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Play, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from './ui/dropdown-menu';

const ActionDropdown = ({ onActionSelect }) => {
  const { t } = useTranslation();

  const handleActionClick = (actionText) => {
    onActionSelect(actionText);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Play className="h-4 w-4" />
          <span className="hidden sm:inline">{t('chat.actions')}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* Email Actions */}
        <DropdownMenuItem onClick={() => handleActionClick('Send an email to {recipient} with this subject {subject} and this content {content}')}>
          {t('actions.sendEmail')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleActionClick('Create a draft to {recipient} with this subject {subject} and this content {content}')}>
          {t('actions.createDraft')}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Summarize Emails */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{t('actions.summarizeEmails')}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => handleActionClick('Summarize today\'s emails')}>
              {t('actions.summarizeToday')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleActionClick('Summarize today\'s emails received from {recipient}')}>
              {t('actions.summarizeTodayFrom')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleActionClick('Summarize last {number} emails')}>
              {t('actions.summarizeLastNumber')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleActionClick('Summarize last {number} emails received from {recipient}')}>
              {t('actions.summarizeLastNumberFrom')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleActionClick('Summarize emails received on {date}')}>
              {t('actions.summarizeOnDate')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleActionClick('Summarize emails received on {date} from {sender}')}>
              {t('actions.summarizeOnDateFrom')}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        
        <DropdownMenuSeparator />
        
        {/* Calendar Actions */}
        <DropdownMenuItem onClick={() => handleActionClick('Set an event {date} at {time} with this subject {subject}')}>
          {t('actions.createCalendarEvent')}
        </DropdownMenuItem>
        
        {/* Contact Actions */}
        <DropdownMenuItem onClick={() => handleActionClick('Create a contact name {name}, email {email}')}>
          {t('actions.createContact')}
        </DropdownMenuItem>
        
        {/* Internet Research */}
        <DropdownMenuItem onClick={() => handleActionClick('Search the internet for {subject}')}>
          {t('actions.internetResearch')}
        </DropdownMenuItem>
        
        {/* PDF Actions */}
        <DropdownMenuItem onClick={() => handleActionClick('Create a {title} pdf with this content: {content}')}>
          {t('actions.createPDF')}
        </DropdownMenuItem>
        
        {/* Slack Actions */}
        <DropdownMenuItem onClick={() => handleActionClick('Send a slack message to {Channel/user} with this content {content}')}>
          {t('actions.sendSlackMessage')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ActionDropdown;
