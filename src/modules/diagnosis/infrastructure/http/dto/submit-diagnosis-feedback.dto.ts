import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EDiagnosisFeedback } from '../../../domain';

export class SubmitDiagnosisFeedbackDto {
  @IsEnum(EDiagnosisFeedback)
  feedback: EDiagnosisFeedback;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
