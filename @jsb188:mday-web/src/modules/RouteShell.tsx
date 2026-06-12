import type { ServerErrorObj } from '@jsb188/app/types/app.d.ts';
import {
	ContentGate,
	ErrorMessage,
	ErrorMessageContainer,
} from '@jsb188/react-web/modules/layout/MainLayout';
import { memo, type Dispatch, type SetStateAction } from 'react';

interface AppRouteShellProps {
	layoutOpen: boolean;
	setLayoutOpen: Dispatch<SetStateAction<boolean>>;
}

interface AppRouteErrorMessageProps extends AppRouteShellProps {
	error?: ServerErrorObj | null;
	iconName: string;
	message: string;
	title: string;
}

/*
 * Render a reusable route error inside the app shell layout.
 */
export const AppRouteErrorMessage = memo((p: AppRouteErrorMessageProps) => {
	const { error, iconName, layoutOpen, message, setLayoutOpen, title } = p;

	return (
		<ErrorMessageContainer
			layoutOpen={layoutOpen}
			setLayoutOpen={setLayoutOpen}
		>
			<ErrorMessage
				iconName={iconName}
				title={title}
				message={message}
				{...error}
			/>
		</ErrorMessageContainer>
	);
});

AppRouteErrorMessage.displayName = 'AppRouteErrorMessage';

/*
 * Render a reusable app-shell loading state while route data is being fetched.
 */
export const AppRouteLoading = memo((p: AppRouteShellProps) => {
	const { layoutOpen, setLayoutOpen } = p;

	return (
		<ErrorMessageContainer
			layoutOpen={layoutOpen}
			setLayoutOpen={setLayoutOpen}
		>
			<ContentGate
				loading
				notReady
				showLoadingIfNotReady
			/>
		</ErrorMessageContainer>
	);
});

AppRouteLoading.displayName = 'AppRouteLoading';
